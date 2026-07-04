package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// Thin client for the internal chain-runner (escrow executor).
func ChainRunner(path string, body any, out any) error {
	base := os.Getenv("CHAIN_RUNNER_URL")
	if base == "" {
		base = "http://chain-runner:5071"
	}
	buf := new(bytes.Buffer)
	if body != nil {
		if err := json.NewEncoder(buf).Encode(body); err != nil {
			return err
		}
	}
	req, err := http.NewRequest("POST", base+path, buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-internal-secret", os.Getenv("CHAIN_RUNNER_SECRET"))
	client := &http.Client{Timeout: 420 * time.Second} // chain txs + confirmations are slow
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		var e map[string]any
		json.NewDecoder(resp.Body).Decode(&e)
		return fmt.Errorf("chain-runner %s: %d %v", path, resp.StatusCode, e)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}
