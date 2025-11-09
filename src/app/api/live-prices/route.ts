import { NextRequest, NextResponse } from "next/server";
import { CoinGeckoRateLimitError } from "@/lib/coingecko";
import { createStreamingLoop, type LiveStreamMessage } from "@/lib/live-stream";

const encoder = new TextEncoder();

const STREAM_INTERVAL_MS = 60000;

function formatSseMessage(data: LiveStreamMessage) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  const ids = idsParam
    ? idsParam
        .split(",")
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean)
    : undefined;

  let stopLoop: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      stopLoop = createStreamingLoop(
        controller,
        STREAM_INTERVAL_MS,
        (payload) => controller.enqueue(formatSseMessage(payload)),
        (error) =>
          controller.enqueue(
            formatSseMessage({
              error: true,
              message:
                error instanceof CoinGeckoRateLimitError
                  ? error.message
                  : "No fue posible actualizar los precios en vivo.",
            })
          ),
        () => controller.enqueue(encoder.encode(":keep-alive\n\n")),
        ids
      );
    },
    cancel() {
      if (stopLoop) {
        stopLoop();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

