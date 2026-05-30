from sqlalchemy import Column, Integer, String, DateTime, Text, BigInteger
from sqlalchemy.sql import func
from backend.core.database import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    filepath = Column(String, unique=True, index=True, nullable=False)
    file_hash = Column(String, unique=True, index=True, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    extension = Column(String, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ExtractedText(Base):
    __tablename__ = "extracted_texts"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, index=True, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
