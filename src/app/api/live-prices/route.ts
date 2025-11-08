import { NextResponse } from "next/server";
import { createStreamingLoop, type LiveStreamMessage } from "@/lib/live-stream";

const encoder = new TextEncoder();

const STREAM_INTERVAL_MS = 60000;

function formatSseMessage(data: LiveStreamMessage) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function GET() {
  let stopLoop: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      stopLoop = createStreamingLoop(
        controller,
        STREAM_INTERVAL_MS,
        (payload) => controller.enqueue(formatSseMessage(payload)),
        () =>
          controller.enqueue(
            formatSseMessage({
              error: true,
              message: "No fue posible actualizar los precios en vivo.",
            })
          ),
        () => controller.enqueue(encoder.encode(":keep-alive\n\n"))
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

