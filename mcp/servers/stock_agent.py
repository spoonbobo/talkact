import dotenv
import os
import json
dotenv.load_dotenv()

from mcp.server.fastmcp import FastMCP
from polygon import RESTClient # type: ignore

mcp = FastMCP("stock_agent")

client = RESTClient(api_key=os.getenv("POLYGON_API_KEY"))
TIMESPAN = "day"
MULTIPLIER = 1
LIMIT = 2000

@mcp.tool()
async def get_stock_price(
    symbol: str,
    from_date: str,
    to_date: str
) -> str:
    """
    Retrieves historical stock price data for a given ticker symbol.
    
    Args:
        symbol: The stock ticker symbol (e.g., "AAPL" for Apple Inc.)
        from_date: The start date for the historical data (format: YYYY-MM-DD)
        to_date: The end date for the historical data (format: YYYY-MM-DD)

    Returns:
        A JSON string containing historical price of the symbol.
    """
    aggs = []
    for a in client.list_aggs(
        ticker=symbol,
        multiplier=MULTIPLIER,
        timespan=TIMESPAN,
        from_=from_date,
        to=to_date,
        limit=LIMIT):

        aggs.append({
            "open": a.open,
            "high": a.high,
            "low": a.low,
            "close": a.close,
            "volume": a.volume,
            "vwap": a.vwap,
            "timestamp": a.timestamp,
            "transactions": a.transactions,
            "otc": a.otc
        })
    return json.dumps(aggs)

if __name__ == "__main__":
    mcp.run(transport='stdio')
