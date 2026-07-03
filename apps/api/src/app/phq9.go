package app

// PHQ-9 scoring: public-domain instrument (Kroenke, Spitzer, Williams).
func ScorePHQ9(answers []int) (score int, band string, item9 bool) {
	for i, a := range answers {
		if a < 0 {
			a = 0
		}
		if a > 3 {
			a = 3
		}
		score += a
		if i == 8 && a > 0 {
			item9 = true
		}
	}
	switch {
	case score <= 4:
		band = "minimal"
	case score <= 9:
		band = "mild"
	case score <= 14:
		band = "moderate"
	case score <= 19:
		band = "moderately_severe"
	default:
		band = "severe"
	}
	return
}
