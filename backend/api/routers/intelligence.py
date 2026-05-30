from fastapi import APIRouter
from pydantic import BaseModel
import spacy
import json
from loguru import logger

# Load the lightweight English model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.error("spaCy en_core_web_sm model not found. Ensure it was downloaded.")
    nlp = None

router = APIRouter(
    prefix="/api/intelligence",
    tags=["Intelligence"]
)

class ExtractRequest(BaseModel):
    category: str
    text: str

@router.post("/extract")
async def extract_metadata(req: ExtractRequest):
    """
    Intelligent Entity Extraction using spaCy and heuristics.
    """
    if not nlp:
        return {"fields": {}}
        
    text = req.text
    doc = nlp(text)
    
    fields = {}
    
    # Common NER extraction across categories
    orgs = [ent.text.strip() for ent in doc.ents if ent.label_ == "ORG"]
    moneys = [ent.text.strip() for ent in doc.ents if ent.label_ == "MONEY"]
    dates = [ent.text.strip() for ent in doc.ents if ent.label_ == "DATE"]
    persons = [ent.text.strip() for ent in doc.ents if ent.label_ == "PERSON"]
    
    cat = req.category.lower()
    
    if cat == "invoice":
        if orgs:
            fields["vendor_name"] = orgs[0]
        if moneys:
            fields["total_amount"] = moneys[-1] # Usually the last money amount is total
        if dates:
            fields["due_date"] = dates[0]
            
    elif cat == "resume":
        if persons:
            fields["candidate_name"] = persons[0]
        
        # Simple skill extraction (heuristic over intelligent text)
        skills_list = ["rust", "react", "typescript", "javascript", "python", "sqlite", "postgresql", "aws", "docker", "c++", "java", "kubernetes", "go", "solidity"]
        found = [s.upper() for s in skills_list if s.lower() in text.lower()]
        if found:
            fields["skills"] = ", ".join(found)
            
    elif cat == "receipt":
        if orgs:
            fields["merchant"] = orgs[0]
        if moneys:
            fields["total_paid"] = moneys[-1]
        if dates:
            fields["date"] = dates[0]
            
    elif cat == "bank statement":
        if orgs:
            fields["bank_name"] = orgs[0]
        if moneys:
            fields["closing_balance"] = moneys[-1]
        if dates:
            fields["statement_period"] = dates[0]
            
    elif cat == "contract":
        if len(orgs) >= 2:
            fields["party_one"] = orgs[0]
            fields["party_two"] = orgs[1]
        if dates:
            fields["agreement_date"] = dates[0]
            
    return {"fields": fields}
