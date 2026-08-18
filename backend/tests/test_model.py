import asyncio

from google import genai


async def main():

    client = genai.Client(
        api_key="AQ.Ab8RN6Jg4AWDE07UuKukgWCrS00H-cyqZCjMUnS2VFCy2th-5Q"
    )

    response = await client.aio.interactions.create(
        model="gemini-2.5-flash",
        input="Reply with exactly: OK",
    )

    print(response.output_text)


asyncio.run(main())
