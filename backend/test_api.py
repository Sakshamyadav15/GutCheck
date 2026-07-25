import os
from dotenv import load_dotenv
import httpx
import asyncio

# Load from parent directory where user created .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

API_KEY = os.getenv('GOOGLE_FACTCHECK_API_KEY')
print(f"Loaded API KEY: {'YES (starts with ' + API_KEY[:6] + '...)' if API_KEY else 'NO'}")

async def test_factcheck():
    if not API_KEY:
        print("Error: GOOGLE_FACTCHECK_API_KEY is not set.")
        return
    
    query = "earth is flat"
    print(f"Testing query: '{query}'")
    
    url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
    params = {
        "query": query,
        "key": API_KEY,
        "languageCode": "en",
        "pageSize": 3,
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        
    if resp.status_code == 200:
        data = resp.json()
        claims = data.get("claims", [])
        print(f"\nSUCCESS! Found {len(claims)} fact checks.")
        if claims:
            print("First result rating:", claims[0].get('claimReview', [{}])[0].get('textualRating', 'N/A'))
    else:
        print(f"\nFAILED: Status {resp.status_code}")
        print(resp.text)

if __name__ == '__main__':
    asyncio.run(test_factcheck())
