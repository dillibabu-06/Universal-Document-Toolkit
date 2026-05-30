use regex::Regex;

/// Extremely fast rule-based text classifier using advanced regex patterns
#[tracing::instrument(skip(text))]
pub fn classify_content(text: &str) -> Option<String> {
    // 1. Invoice Regex Patterns (e.g. GSTIN, Invoice No, Total Due)
    let invoice_re = Regex::new(r"(?i)gstin|invoice\s*no|tax\s*amount|total\s*due|bill\s*to|due\s*date|balance\s*due").ok()?;
    // 2. Resume Regex Patterns (e.g. Curriculum Vitae, Education, Experience)
    let resume_re = Regex::new(r"(?i)curriculum\s*vitae|education|experience|skills|career\s*objective|resume").ok()?;
    // 3. Bank Statement Regex Patterns (e.g. Account Number, Transaction Date)
    let statement_re = Regex::new(r"(?i)account\s*number|transaction\s*date|closing\s*balance|ledger\s*statement|statement\s*of\s*account").ok()?;
    // 4. Receipt Regex Patterns (e.g. Amount Paid, Transaction ID)
    let receipt_re = Regex::new(r"(?i)amount\s*paid|transaction\s*id|payment\s*receipt|receipt\s*no|cash\s*receipt").ok()?;
    // 5. Contract Regex Patterns (e.g. NDA, MOU, Agreement)
    let contract_re = Regex::new(r"(?i)agreement|nda|contract\s*agreement|parties\s*agree|confidentiality").ok()?;
    // 6. Tax Document Regex Patterns (e.g. ITR, Form 16)
    let tax_re = Regex::new(r"(?i)tax\s*return|itr|form\s*16|income\s*tax").ok()?;

    if invoice_re.is_match(text) {
        return Some("Invoice".to_string());
    }
    if resume_re.is_match(text) {
        return Some("Resume".to_string());
    }
    if statement_re.is_match(text) {
        return Some("Bank Statement".to_string());
    }
    if receipt_re.is_match(text) {
        return Some("Receipt".to_string());
    }
    if contract_re.is_match(text) {
        return Some("Contract".to_string());
    }
    if tax_re.is_match(text) {
        return Some("Tax Document".to_string());
    }

    None
}
