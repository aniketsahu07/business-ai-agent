"""
seed_data.py – Run this ONCE to load your business info into ChromaDB.

Usage:
    python seed_data.py

Edit the BUSINESS_INFO string below with YOUR actual business details.
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from document_loader import DocumentLoader
from rag_engine import RAGEngine

# ──────────────────────────────────────────────────────────────
#  ✏️  EDIT THIS with your real business data
# ──────────────────────────────────────────────────────────────
BUSINESS_INFO = """
Business Name: FitLife Gym & Wellness Center

About Us:
FitLife is a premium fitness and wellness center located in Delhi, India.
We have been serving clients since 2015. Our mission is to transform lives
through fitness, nutrition, and mental wellness.

Services:
1. Personal Training – ₹3,000/month (4 sessions)
2. Group Fitness Classes – ₹1,500/month (unlimited classes)
3. Yoga & Meditation – ₹1,200/month
4. Nutrition Counseling – ₹800/session
5. Physiotherapy – ₹1,000/session

Membership Plans:
- Basic Plan: ₹2,000/month – Gym access 6 AM to 10 PM
- Premium Plan: ₹4,500/month – Gym + all classes + 1 personal training session
- Annual Premium: ₹45,000/year – Best value, 2 months free

Timings:
Monday to Saturday: 6:00 AM – 10:00 PM
Sunday: 8:00 AM – 6:00 PM

Location: Plot 45, Sector 18, Noida, Uttar Pradesh – 201301

Contact:
Phone: +91-98765-43210
Email: info@fitlifegym.in
WhatsApp: +91-98765-43210

FAQs:
Q: Kya trial class available hai?
A: Haan! Pehli class bilkul free hai. Bas apna naam aur number do, hum confirm karenge.

Q: What equipment do you have?
A: We have treadmills, cross-trainers, free weights (5kg–50kg), cable machines,
   Smith machines, and a dedicated cardio zone.

Q: Do you offer diet plans?
A: Yes, our certified nutritionist creates personalised diet plans. Available with
   Premium membership or as a standalone service at ₹800/session.

Q: Kya ladies ke liye alag section hai?
A: Haan, humare paas dedicated ladies zone available hai with female trainers.

Q: EMI available hai?
A: Haan! Annual plan par 3-month no-cost EMI available hai via Razorpay.

Special Offers:
- Refer a friend and get 1 month FREE.
- Student discount: 20% off on Basic plan (valid ID required).
- Corporate tie-ups available for teams of 10+.

Trainers:
- Rahul Sharma – Certified Personal Trainer (ACE), 8 years experience.
- Priya Singh – Yoga Instructor (RYT 500), specialises in prenatal yoga.
- Dr. Anil Mehta – Physiotherapist, BPT, MPT.
"""

PRICING_PAGE_URL = ""   # Optional: add your website URL here


def main():
    print("🌱 Seeding business knowledge base...")
    loader    = DocumentLoader()
    rag       = RAGEngine()

    # 1) Core business info
    docs = loader.ingest_raw_text(BUSINESS_INFO, source_name="business_info")
    rag.add_documents(docs)
    print(f"  ✅ Business info: {len(docs)} chunks")

    # 2) Optional: scrape website
    if PRICING_PAGE_URL:
        docs = loader.ingest_url(PRICING_PAGE_URL)
        rag.add_documents(docs)
        print(f"  ✅ Website: {len(docs)} chunks")

    # 3) Optional: load PDFs from ./data/business_docs/
    pdf_dir = "./data/business_docs"
    if os.path.isdir(pdf_dir):
        docs = loader.ingest_directory(pdf_dir)
        if docs:
            rag.add_documents(docs)
            print(f"  ✅ PDFs: {len(docs)} chunks")

    print("\n🎉 Knowledge base ready! Run the server with: uvicorn main:app --reload")


if __name__ == "__main__":
    main()
