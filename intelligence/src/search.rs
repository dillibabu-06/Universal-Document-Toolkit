use sdw_core::error::Result;
use serde::{Deserialize, Serialize};
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartQuery {
    pub raw_query: String,
    pub keyword: String,
    pub category_filter: Option<String>,
    pub amount_greater_than: Option<f64>,
    pub amount_less_than: Option<f64>,
    pub created_after: Option<i64>,
    pub created_before: Option<i64>,
    pub related_to_query: Option<String>,
}

pub struct SearchIntelligence;

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

fn days_since_1970(year: i32) -> i64 {
    let mut days = 0;
    if year >= 1970 {
        for y in 1970..year {
            if is_leap_year(y) {
                days += 366;
            } else {
                days += 365;
            }
        }
    } else {
        for y in year..1970 {
            if is_leap_year(y) {
                days -= 366;
            } else {
                days -= 365;
            }
        }
    }
    days
}

impl SearchIntelligence {
    /// Internal parser parsing categories, amounts, dates, and clean keywords
    fn parse_internal(query: &str) -> SmartQuery {
        let mut sq = SmartQuery {
            raw_query: query.to_string(),
            keyword: query.to_string(),
            category_filter: None,
            amount_greater_than: None,
            amount_less_than: None,
            created_after: None,
            created_before: None,
            related_to_query: None,
        };

        let mut q_clean = query.to_string();
        let q_lower = query.to_lowercase();

        // 1. Parse Categories
        if q_lower.contains("invoice") {
            sq.category_filter = Some("Invoice".to_string());
        } else if q_lower.contains("receipt") {
            sq.category_filter = Some("Receipt".to_string());
        } else if q_lower.contains("resume") || q_lower.contains("cv") {
            sq.category_filter = Some("Resume".to_string());
        } else if q_lower.contains("contract") || q_lower.contains("agreement") || q_lower.contains("nda") || q_lower.contains("mou") {
            sq.category_filter = Some("Contract".to_string());
        } else if q_lower.contains("statement") || q_lower.contains("bank") {
            sq.category_filter = Some("Bank Statement".to_string());
        } else if q_lower.contains("tax") {
            sq.category_filter = Some("Tax Document".to_string());
        } else if q_lower.contains("notes") || q_lower.contains("note") || q_lower.contains("assignment") || q_lower.contains("lecture") {
            sq.category_filter = Some("College Notes".to_string());
        }

        // Category keywords to strip
        let category_words = [
            "invoices", "invoice", "receipts", "receipt", "resumes", "resume", 
            "cvs", "cv", "contracts", "contract", "agreements", "agreement", 
            "ndas", "nda", "mous", "mou", "statements", "statement", "banks", "bank", 
            "taxes", "tax", "notes", "note", "assignments", "assignment", "lectures", "lecture"
        ];

        // 2. Parse amounts (e.g. "above $1000", "over $500", "> 500", "under 1000", "below 200")
        if let Ok(re_over) = Regex::new(r"(over|above|greater than|>)\s*\$?(\d+)") {
            if let Some(caps) = re_over.captures(&q_lower) {
                if let Ok(val) = caps[2].parse::<f64>() {
                    sq.amount_greater_than = Some(val);
                    q_clean = q_clean.replace(&caps[0], "");
                }
            }
        }
        
        if let Ok(re_under) = Regex::new(r"(under|below|less than|<)\s*\$?(\d+)") {
            if let Some(caps) = re_under.captures(&q_lower) {
                if let Ok(val) = caps[2].parse::<f64>() {
                    sq.amount_less_than = Some(val);
                    q_clean = q_clean.replace(&caps[0], "");
                }
            }
        }

        // 3. Parse Years (e.g. "signed in 2025", "in 2025", "from 2024")
        if let Ok(re_year) = Regex::new(r"\b(in|from|signed in|created in)?\s*(20\d{2}|19\d{2})\b") {
            if let Some(caps) = re_year.captures(&q_lower) {
                if let Ok(year) = caps[2].parse::<i32>() {
                    let start_ts = days_since_1970(year) * 86400;
                    let end_ts = (days_since_1970(year + 1) * 86400) - 1;
                    sq.created_after = Some(start_ts);
                    sq.created_before = Some(end_ts);
                    q_clean = q_clean.replace(&caps[0], "");
                }
            }
        }

        // 4. Extract Keywords (remove prepositions, category words, and filler terms)
        let fillers = [
            "show", "find", "list", "search", "me", "all", "the", "a", "an", 
            "from", "with", "containing", "containing keywords", "containing words",
            "signed", "created", "and", "or", "for", "in"
        ];

        let mut keyword_words = Vec::new();
        for word in q_clean.split_whitespace() {
            let w_clean = word.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase();
            if w_clean.is_empty() {
                continue;
            }
            if category_words.contains(&w_clean.as_str()) {
                continue;
            }
            if fillers.contains(&w_clean.as_str()) {
                continue;
            }
            keyword_words.push(w_clean);
        }

        sq.keyword = keyword_words.join(" ").trim().to_string();
        sq
    }

    /// Parse a natural language search query
    pub fn parse(query: &str) -> Result<SmartQuery> {
        let mut related_to_query = None;
        let mut primary_query = query.to_string();

        // Detect relationship connectors: "related to", "associated with", "linked to"
        if let Ok(re_relation) = Regex::new(r"(?i)(.+)\s+(related to|associated with|linked to)\s+(.+)") {
            if let Some(caps) = re_relation.captures(query) {
                primary_query = caps[1].trim().to_string();
                related_to_query = Some(caps[3].trim().to_string());
            }
        }

        let mut sq = Self::parse_internal(&primary_query);
        sq.related_to_query = related_to_query;
        sq.raw_query = query.to_string();

        Ok(sq)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_natural_query_parser() {
        let q1 = SearchIntelligence::parse("show invoices from amazon").unwrap();
        assert_eq!(q1.category_filter.as_deref(), Some("Invoice"));
        assert_eq!(q1.keyword, "amazon");

        let q2 = SearchIntelligence::parse("contracts signed in 2025").unwrap();
        assert_eq!(q2.category_filter.as_deref(), Some("Contract"));
        assert!(q2.created_after.is_some());
        assert!(q2.created_before.is_some());
        assert_eq!(q2.keyword, "");

        let q3 = SearchIntelligence::parse("resumes with rust and react").unwrap();
        assert_eq!(q3.category_filter.as_deref(), Some("Resume"));
        assert_eq!(q3.keyword, "rust react");

        let q4 = SearchIntelligence::parse("receipts above $1000").unwrap();
        assert_eq!(q4.category_filter.as_deref(), Some("Receipt"));
        assert_eq!(q4.amount_greater_than, Some(1000.0));
        assert_eq!(q4.keyword, "");

        let q5 = SearchIntelligence::parse("receipts related to amazon invoices").unwrap();
        assert_eq!(q5.category_filter.as_deref(), Some("Receipt"));
        assert_eq!(q5.related_to_query.as_deref(), Some("amazon invoices"));
    }
}
