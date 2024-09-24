addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

const connections = new Set<WebSocket>();
let lastFetchedTimestamp: string | null = null; // Store the returned `next_timestamp`

async function handleRequest(request: Request): Promise<Response> {
  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols') || ''; // Get 'symbols' from query params

  const { 0: client, 1: server } = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
  server.accept();
  connections.add(server);

  server.addEventListener('close', () => {
    connections.delete(server);
  });

  try {
    // Fetch and send initial data (no timestamp provided initially)
    const initialData = await fetchData(symbols, lastFetchedTimestamp);
    const initialMessage = JSON.stringify(initialData);
    server.send(initialMessage);

    // Log the first batch and the initial timestamp
    console.log("Initial batch of data:", initialData);

    // Set up a regular interval to fetch and send updates every minute
    setInterval(async () => {
      try {
        console.log(`Calling API with lastFetchedTimestamp: ${lastFetchedTimestamp} at ${new Date().toLocaleString()}`);
        
        const updateData = await fetchData(symbols, lastFetchedTimestamp);
        const updateMessage = JSON.stringify(updateData);

        console.log("Data received from API:", updateData);

        connections.forEach(conn => conn.send(updateMessage));
      } catch (error) {
        console.error("Failed to send updates:", error);
      }
    }, 60000); // Update every minute

  } catch (error) {
    console.error("Failed to fetch initial data:", error);
  }

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// Fetch data from the API, using lastFetchedTimestamp if available
async function fetchData(symbols: string, lastTimestamp: string | null): Promise<{ data: any[], next_timestamp?: string }> {
  let url = `https://testapi.tradingflow.com/api-portal/option-trades-aggregated`;

  if (lastTimestamp) {
    // Convert lastTimestamp to a number and add 1 second to prevent overlap
    const nextTimestamp = (parseInt(lastTimestamp, 10) + 1).toString();
    url += `?timestamp=${nextTimestamp}`; // Use last known timestamp plus offset to fetch data strictly after
  }

  if (symbols) {
    url += lastTimestamp ? `&symbol=${encodeURIComponent(symbols)}` : `?symbol=${encodeURIComponent(symbols)}`; // Add symbol parameter to the API URL
  }

  console.log(`Fetching data from URL: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API call failed with status ${response.status} and message ${await response.text()}`);
  }

  const apiResponse = await response.json() as ApiResponse;

  // Update the lastFetchedTimestamp with the `next_timestamp` provided by the API
  if (apiResponse.next_timestamp) {
    console.log(`Updating lastFetchedTimestamp from ${lastFetchedTimestamp} to ${apiResponse.next_timestamp}`);
    lastFetchedTimestamp = apiResponse.next_timestamp;
  }

  return {
    data: apiResponse.data
  };
}

interface ApiResponse {
  status: string;
  data: Array<{
    id: string;
    symbol: string;
    expiration_date: {
      value: string;
    };
    strike: number;
    put_call: string;
    date: {
      value: string;
    };
    time: {
      value: string;
    };
    size: number;
    price: number;
    bid: number;
    ask: number;
    oi: number;
    option_activity_type: string | null;
    iv: number;
    delta: number;
    underlying_price: number;
    trade_count: number;
    underlying_type: string;
    premium: number;
    side: string;
    sentiment: string;
    moneyness: string;
    dex: number;
    expiry_days: number;
    dei: number;
    option_symbol: string;
    gamma: number;
    daily_volume: number;
    earning_date: string | null;
  }>;
  next_timestamp: string | null;
}
