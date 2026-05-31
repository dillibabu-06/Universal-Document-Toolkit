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
}

pub struct SearchIntelligence;

impl SearchIntelligence {
    pub fn parse(query: &str) -> Result<SmartQuery> {
        let mut sq = SmartQuery {
            raw_query: query.to_string(),
            keyword: query.to_string(),
            category_filter: None,
            amount_greater_than: None,
            amount_less_than: None,
        };

        let q_lower = query.to_lowercase();

        // Parse Categories
        if q_lower.contains("invoice") || q_lower.contains("receipt") {
            sq.category_filter = Some("Invoice".to_string());
            sq.keyword = sq.keyword.to_lowercase().replace("invoices", "").replace("invoice", "").replace("receipt", "").trim().to_string();
        } else if q_lower.contains("resume") || q_lower.contains("cv") {
            sq.category_filter = Some("Resume".to_string());
            sq.keyword = sq.keyword.to_lowercase().replace("resumes", "").replace("resume", "").replace("cv", "").trim().to_string();
        } else if q_lower.contains("contract") || q_lower.contains("agreement") {
            sq.category_filter = Some("Contract".to_string());
            sq.keyword = sq.keyword.to_lowercase().replace("contracts", "").replace("contract", "").replace("agreement", "").trim().to_string();
        }

        // Parse amounts (e.g. "over $500", "> 500", "under 1000")
        if let Ok(re_over) = Regex::new(r"(over|greater than|>)\s*\$?(\d+)") {
            if let Some(caps) = re_over.captures(&q_lower) {
                if let Ok(val) = caps[2].parse::<f64>() {
                    sq.amount_greater_than = Some(val);
                    sq.keyword = sq.keyword.replace(&caps[0], "").trim().to_string();
                }
            }
        }
        
        if let Ok(re_under) = Regex::new(r"(under|less than|<)\s*\$?(\d+)") {
            if let Some(caps) = re_under.captures(&q_lower) {
                if let Ok(val) = caps[2].parse::<f64>() {
                    sq.amount_less_than = Some(val);
                    sq.keyword = sq.keyword.replace(&caps[0], "").trim().to_string();
                }
            }
        }
        
        // Remove 'with' or 'for' stop words often left over
        sq.keyword = sq.keyword.replace(" with ", " ").replace(" for ", " ").replace(" all ", " ").trim().to_string();

        Ok(sq)
    }
}
