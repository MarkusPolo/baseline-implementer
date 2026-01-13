import asyncio
import httpx
import time

async def test_port_performance():
    url = "http://localhost:8000/api/console/ports"
    
    print("Testing port probing performance...")
    
    # First call (uncached or partially concurrent)
    start = time.perf_counter()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url)
            elapsed1 = time.perf_counter() - start
            print(f"First call (probing): {elapsed1:.2f}s")
            
            # Second call (should be cached)
            start = time.perf_counter()
            resp = await client.get(url)
            elapsed2 = time.perf_counter() - start
            print(f"Second call (cached): {elapsed2:.2f}s")
            
            if elapsed2 < elapsed1:
                print("SUCCESS: Caching is working as expected.")
            else:
                print("WARNING: Caching might not be effective or results too fast to distinguish.")
                
        except Exception as e:
            print(f"Error during verification: {e}")

if __name__ == "__main__":
    asyncio.run(test_port_performance())
