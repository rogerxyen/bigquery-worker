# WebSocket API: Streaming Option Trades Data

This WebSocket API streams real-time options trade data, fetching the latest records every minute from an API. The WebSocket supports symbol filtering and manages timestamps to avoid data overlap.

---

## How to Use

### WebSocket URL:

wss://bigquery-worker.engineering-601.workers.dev/

Example with symbol filter:

wss://bigquery-worker.engineering-601.workers.dev/?symbols=NVDA

### Query Parameters:

- `symbols` (optional): Comma-separated option symbols to filter the data (e.g., `symbols=AAPL,GOOG`).

#### Examples:

wss://bigquery-worker.engineering-601.workers.dev/?symbols=AAPL
wss://bigquery-worker.engineering-601.workers.dev/?symbols=AAPL,GOOG


---

## WebSocket Data Flow

### 1. Initial Connection:
- Upon first connection, the WebSocket fetches the most recent trade data (up to 10,000 records).
- If no timestamp is provided, it fetches the most recent records.
- The `next_timestamp` is returned by the API and used for subsequent data fetches.

### 2. Subsequent Data Fetches:
- The WebSocket fetches new trade data every minute after the latest timestamp (returned in the initial call).
- If no new data is available, an empty data frame is returned, and the timestamp remains unchanged until new data arrives.

### 3. Empty Responses:
- If no new data is available, the WebSocket sends back an empty data frame and does not update the timestamp.

### 4. Symbol Filtering:
- The WebSocket can query specific option symbols via query parameters (e.g., `symbols=AAPL`).
- You can specify multiple symbols separated by commas.

---

## Expected JSON Response Format

The WebSocket sends JSON-formatted data for each fetch cycle. Here is the format:

```json
{
  "data": [
    {
      "id": "m1157cyp",
      "symbol": "AAPL",
      "strike": 150,
      "put_call": "CALL",
      "date": "2024-09-13",
      "time": "16:03:02",
      "price": 5.55,
      "size": 10,
      "premium": 5550,
      "bid": 5.50,
      "ask": 5.60,
      "oi": 200,
      "option_activity_type": "TRADE",
      "underlying_price": 153.40,
      "delta": 0.45,
      "gamma": 0.12,
      "daily_volume": 1200
    }
  ]
}

If no new trades are available, the response will look like:

{
  "data": [],
  "next_timestamp": "1726486800"
}

