// Package shin is a minimal client for the Socious Verify (Shin) API —
// credential schemas, credential issuance, and predicate verifications.
// Docs: https://api.shinid.com/docs ; source: github.com/socious-io/shin-api.
package shin

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/socious-io/mental-health/api/src/config"
)

var (
	mu          sync.Mutex
	accessToken string
	tokenAt     time.Time
)

func host() string { return config.C.Shin.Host }

func request(method, path, token string, body any, out any) error {
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			return err
		}
	}
	req, err := http.NewRequest(method, host()+path, &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	client := &http.Client{Timeout: 20 * time.Second}
	var resp *http.Response
	for attempt := 0; attempt < 3; attempt++ { // shin has a 2s upstream ctx; retry transient failures
		resp, err = client.Do(req)
		if err == nil && resp.StatusCode < 500 {
			break
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(time.Duration(attempt+1) * 800 * time.Millisecond)
		req.Body = nil
		if body != nil {
			b2 := new(bytes.Buffer)
			json.NewEncoder(b2).Encode(body)
			req, _ = http.NewRequest(method, host()+path, b2)
			req.Header.Set("Content-Type", "application/json")
			if token != "" {
				req.Header.Set("Authorization", "Bearer "+token)
			}
		}
	}
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		var e map[string]any
		json.NewDecoder(resp.Body).Decode(&e)
		return fmt.Errorf("shin %s %s: %d %v", method, path, resp.StatusCode, e)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// Token logs the service account in (cached ~10 min; shin access tokens are short-lived).
func Token() (string, error) {
	mu.Lock()
	defer mu.Unlock()
	if accessToken != "" && time.Since(tokenAt) < 10*time.Minute {
		return accessToken, nil
	}
	var res struct {
		AccessToken string `json:"access_token"`
	}
	err := request("POST", "/auth/login", "", map[string]string{
		"email":    config.C.Shin.Email,
		"password": config.C.Shin.Password,
	}, &res)
	if err != nil {
		return "", err
	}
	accessToken = res.AccessToken
	tokenAt = time.Now()
	return accessToken, nil
}

type Credential struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

// IssueCredential creates a credential for a recipient; the user claims it by
// opening ConnectURL (QR) with Socious Wallet.
func IssueCredential(name, description, schemaID, recipientEmail, recipientName string, claims []map[string]any) (*Credential, error) {
	tok, err := Token()
	if err != nil {
		return nil, err
	}
	var res Credential
	body := map[string]any{
		"credential": map[string]any{
			"name":        name,
			"description": description,
			"schema_id":   schemaID,
			"claims":      claims,
		},
		"recipient": map[string]any{
			"first_name": recipientName,
			"last_name":  "-",
			"email":      recipientEmail,
		},
	}
	if err := request("POST", "/credentials/with-recipient", tok, body, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

func CredentialConnectURL(id string) string {
	return fmt.Sprintf("%s/connect/credential/%s", config.C.Shin.AppHost, id)
}

func GetCredential(id string) (*Credential, error) {
	tok, err := Token()
	if err != nil {
		return nil, err
	}
	var res Credential
	if err := request("GET", "/credentials/"+id, tok, nil, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// VerificationRedirectURL sends a Moya user into Shin's per-user proof flow.
func VerificationRedirectURL(verificationID, customerID string) string {
	return fmt.Sprintf("%s/connect/redirect/%s?customer=%s", config.C.Shin.AppHost, verificationID, customerID)
}

type IndividualStatus struct {
	Status     string         `json:"status"`
	Body       map[string]any `json:"body"`
	VerifiedAt *time.Time     `json:"verified_at"`
}

// CheckIndividual polls a per-user verification result (apikey auth).
func CheckIndividual(verificationID, customerID string) (*IndividualStatus, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/verifications/%s/individuals/%s", host(), verificationID, customerID), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", config.C.Shin.ApiKey)
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("shin individuals: %d", resp.StatusCode)
	}
	var res IndividualStatus
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return &res, nil
}

type Individual struct {
	ID            string  `json:"id"`
	Status        string  `json:"status"`
	ConnectionURL *string `json:"connection_url"`
}

// CreateIndividual registers a per-user verification session (public endpoint).
func CreateIndividual(verificationID, customerID string) (*Individual, error) {
	var res Individual
	err := request("POST", "/verifications/individuals", "", map[string]any{
		"verification_id": verificationID,
		"customer_id":     customerID,
	}, &res)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

// IndividualConnect returns the wallet-scannable OOB short link for the session.
func IndividualConnect(individualID string) (string, error) {
	var res Individual
	if err := request("GET", "/verifications/"+individualID+"/connect", "", nil, &res); err != nil {
		return "", err
	}
	if res.ConnectionURL == nil {
		return "", fmt.Errorf("shin returned no connection_url")
	}
	return *res.ConnectionURL, nil
}

// IndividualVerify drives Shin's proof verification for the session (the
// shin-webapp normally polls this; Moya's backend does it instead).
func IndividualVerify(individualID string) {
	_ = request("GET", "/verifications/"+individualID+"/verify", "", nil, nil)
}

// ResolveShort resolves a Shin short link the way the wallet scanner does:
// GET {short}/fetch -> {"long_url": "..."}.
func ResolveShort(shortURL string) (string, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(shortURL + "/fetch")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var out struct {
		LongURL string `json:"long_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	if out.LongURL == "" {
		return "", fmt.Errorf("short link resolved to empty long_url")
	}
	return out.LongURL, nil
}

// IndividualCallback relays the wallet's post-connect callback to Shin,
// which sends the proof request over the established DIDComm connection.
func IndividualCallback(individualID string) error {
	return request("GET", "/verifications/"+individualID+"/callback", "", nil, nil)
}
