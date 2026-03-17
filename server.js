const http = require("http");
const { URL } = require("url");

// Random seeds are added to bypass any caching layers
const server = http.createServer(async (req, res) => {
    if (req.url.startsWith("/api/ai")) {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        let prompt = urlObj.searchParams.get("prompt");

        if (!prompt) {
            res.writeHead(400);
            return res.end("Missing prompt");
        }

        // Sanitization Layer: Strip characters that could be used to break out of XML or encoded prompts
        // We only sanitize the internal user_query content if we had access to it separately, 
        // but since the whole prompt is sent, we'll strip potential end-tags from the raw prompt 
        // string to prevent early closure of sandboxing tags.
        prompt = prompt.replace(/<\/user_query>/gi, "[REDACTED_TAG]");
        prompt = prompt.replace(/---/g, "[REDACTED_DIVIDER]");

        try {
            // Target the public text endpoint securely from the backend
            const pollinationsUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?seed=${Math.floor(Math.random() * 100000)}`;

            // It is critical to pass NO identifiable headers. This mimics a direct browser visit.
            const response = await fetch(pollinationsUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*, text/plain'
                }
            });

            if (!response.ok) {
                console.error(`AI API Error: ${response.status}`);
                throw new Error(`AI API returned status ${response.status}`);
            }

            const text = await response.text();

            // Return to the frontend chatbot with CORS allowed
            res.writeHead(200, {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin": "*"
            });
            res.end(text);

        } catch (err) {
            console.error(err);
            res.writeHead(500, {
                "Access-Control-Allow-Origin": "*"
            });
            res.end("Server error connecting to AI");
        }
    } else {
        res.writeHead(404);
        res.end("Not found");
    }
});

server.listen(3000, () => {
    console.log("GN-Bot Proxy Server running at http://localhost:3000");
});