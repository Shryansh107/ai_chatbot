import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface ErrorData {
  message?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { latexSource } = await req.json();

    if (!latexSource || typeof latexSource !== "string") {
      return NextResponse.json(
        { error: "Invalid LaTeX source provided" },
        { status: 400 }
      );
    }

    console.log("Received LaTeX source for compilation via API");

    // Use the external API for compilation
    const startTime = Date.now();
    const response = await fetch(`${process.env.PDFLATEX_BASE_URL}/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: latexSource }),
    });

    const endTime = Date.now();
    console.log(`API request completed in ${endTime - startTime}ms`);

    if (!response.ok) {
      // Try to parse error response
      let errorData: ErrorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: "Unknown error from compilation API" };
      }

      console.error("LaTeX compilation API error:", response.status, errorData);

      return NextResponse.json(
        {
          error: "PDF compilation failed",
          details:
            errorData.message || `API returned status ${response.status}`,
          log: JSON.stringify(errorData),
        },
        { status: 500 }
      );
    }

    // Get PDF data from response
    const pdfBuffer = await response.arrayBuffer();
    console.log(
      `Successfully received PDF from API (${pdfBuffer.byteLength} bytes)`
    );

    // Return the PDF buffer
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="resume.pdf"',
      },
    });
  } catch (error: any) {
    console.error("Error during API-based PDF compilation:", error);

    return NextResponse.json(
      {
        error: "PDF compilation failed",
        details: error.message || "Unknown error during compilation",
        log: error.stack || null,
      },
      { status: 500 }
    );
  }
} 