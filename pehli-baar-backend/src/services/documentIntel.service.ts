/**
 * Document Intelligence Service — OCR text extraction
 *
 * Uses Azure Document Intelligence (Layout model) to extract raw text
 * and table structures from uploaded document images and PDFs.
 *
 * @module services/documentIntel.service
 */

import { getDocIntelClient } from "../config/azure.js";
import { telemetry } from "../config/azure.js";
import { DOC_INTEL_MODEL_ID, UPSTREAM_TIMEOUT_MS } from "../constants.js";
import { AppError, ErrorCode } from "../types/index.js";

/**
 * Extracts raw text content from a document using Azure Document Intelligence.
 *
 * Sends the document buffer directly to the Layout model for analysis.
 * Concatenates text from all pages with page separators. Includes table
 * structures as formatted text blocks.
 *
 * @param fileBuffer - the preprocessed document file buffer (JPEG or PDF)
 * @param contentType - the MIME type of the file ("image/jpeg" or "application/pdf")
 * @returns the extracted text content as a single string
 * @throws {AppError} UPSTREAM_TIMEOUT if analysis exceeds 30 seconds
 * @throws {AppError} DOCUMENT_UNREADABLE if no text is found
 * @throws {AppError} INTERNAL_ERROR for unexpected failures
 */
export async function extractText(
  fileBuffer: Buffer,
  contentType: string,
  originalname?: string
): Promise<string> {
  if (process.env["SIMULATION_MODE"] === "true") {
    const filename = (originalname ?? "").toLowerCase();

    if (filename.includes("hostel") || filename.includes("accomodation") || filename.includes("room")) {
      return `PEHLI BAAR ACADEMY HOSTEL REGISTRATION & ROOM ALLOTMENT
Document Reference: PB-H-2026-0812
Date: 12 June 2026

Dear Student,
This is with reference to your request for hostel accommodation at Pehli Baar Academy.

Please complete the following hostel joining formalities:
1. Hostel Rent & Fees: The annual hostel room rent is Rs 18,000, and a refundable hostel security deposit of Rs 5,000 must be paid to confirm your room assignment.
2. Deadline: All hostel payments must be completed by 18 July 2026.
3. Form Submission: Please download and fill out the Hostel Allotment Form (Form H-10) and submit it to the Warden's Office.
4. Rules: Residents must strictly follow the hostel gate timings (in by 9:00 PM). Parents' local guardian approval form is mandatory.

Hostel Warden Office
Pehli Baar Academy`;
    }

    if (filename.includes("scholarship") || filename.includes("stipend") || filename.includes("grant") || filename.includes("scheme")) {
      return `PEHLI BAAR ACADEMY SCHOLARSHIP NOTICE & FINANCIAL ASSISTANCE
Document Reference: PB-S-2026-0419
Date: 08 June 2026

Dear Student,
Pehli Baar Academy is pleased to announce the applications for the annual Merit-cum-Means Financial Scholarship Scheme for the academic session 2026-27.

Please read the guidelines carefully:
1. Scholarship Grant: Eligible candidates will receive a financial grant / stipend of Rs 25,000 per year towards tuition fees.
2. Eligibility: The annual family income of the applicant must not exceed Rs 2,50,000 per year. Original income certificate from Tehsildar is mandatory.
3. Deadline: The online application form must be filled and uploaded along with Class 12 marksheet on the student portal by 31 August 2026.

Scholarship Desk
Pehli Baar Academy`;
    }

    // Default Admission letter mock
    return `PEHLI BAAR ACADEMY ADMISSION & FEE PORTAL DETAILS
Document Reference: PB-2026-9938
Date: 10 June 2026

Dear Student,
Congratulations on your provisional admission to the Bachelor of Science (B.Sc. Hons) program at Pehli Baar Academy.

Please note the following critical instructions:
1. Admission Fee: You are required to pay the first semester fee of Rs 15,250 to confirm your seat.
2. Deadline: The fee must be deposited on or before 15 July 2026.
3. Documents Needed: You must bring your original Class 12 Marksheet, Passing Certificate, and Aadhaar Card for physical verification at Room 102 on 20 July 2026.
4. Hostel Allotment: If you require hostel accommodation, you must submit the Hostel Allotment Form (Form H-10) along with a deposit of Rs 8,000 by 18 July 2026.
5. Refund Policy: If you cancel your admission before 12 July 2026, a full refund (minus Rs 1,000 processing fee) will be issued. No refunds will be processed after 15 July 2026.

We wish you all the best in your academic journey.

Yours sincerely,
Registrar Office
Pehli Baar Academy`;
  }

  const client = getDocIntelClient();

  try {
    // Create an abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, UPSTREAM_TIMEOUT_MS);

    // Start analysis with the Layout model
    const poller = await client.beginAnalyzeDocument(
      DOC_INTEL_MODEL_ID,
      fileBuffer,
      {
        abortSignal: abortController.signal,
      }
    );

    // Wait for the result
    const result = await poller.pollUntilDone();
    clearTimeout(timeoutId);

    if (!result) {
      throw new AppError(
        ErrorCode.DOCUMENT_UNREADABLE,
        "Document analysis returned no result."
      );
    }

    // Extract text from pages
    const textParts: string[] = [];

    if (result.pages) {
      for (const page of result.pages) {
        const pageNum = page.pageNumber;
        const pageLines: string[] = [];

        if (page.lines) {
          for (const line of page.lines) {
            if (line.content) {
              pageLines.push(line.content);
            }
          }
        }

        if (pageLines.length > 0) {
          textParts.push(
            `--- Page ${pageNum} ---\n${pageLines.join("\n")}`
          );
        }
      }
    }

    // Extract table structures
    if (result.tables) {
      for (let tableIdx = 0; tableIdx < result.tables.length; tableIdx++) {
        const table = result.tables[tableIdx];
        if (!table || !table.cells) continue;

        const tableLines: string[] = [`\n[Table ${tableIdx + 1}]`];

        // Group cells by row
        const rows = new Map<number, Map<number, string>>();
        for (const cell of table.cells) {
          const rowIdx = cell.rowIndex;
          const colIdx = cell.columnIndex;
          if (!rows.has(rowIdx)) {
            rows.set(rowIdx, new Map());
          }
          rows.get(rowIdx)?.set(colIdx, cell.content ?? "");
        }

        // Format rows
        const sortedRowKeys = [...rows.keys()].sort((a, b) => a - b);
        for (const rowIdx of sortedRowKeys) {
          const row = rows.get(rowIdx);
          if (!row) continue;
          const sortedColKeys = [...row.keys()].sort((a, b) => a - b);
          const cells = sortedColKeys.map((k) => row.get(k) ?? "");
          tableLines.push(cells.join(" | "));
        }

        textParts.push(tableLines.join("\n"));
      }
    }

    // Also include the general content if pages didn't yield much
    if (textParts.length === 0 && result.content) {
      textParts.push(result.content);
    }

    const fullText = textParts.join("\n\n").trim();

    if (fullText.length === 0) {
      throw new AppError(
        ErrorCode.DOCUMENT_UNREADABLE,
        "No readable text found in the document."
      );
    }

    return fullText;
  } catch (err) {
    // Re-throw AppErrors as-is
    if (err instanceof AppError) {
      throw err;
    }

    // Handle abort/timeout
    if (
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"))
    ) {
      throw new AppError(
        ErrorCode.UPSTREAM_TIMEOUT,
        "Document analysis timed out. Please try again with a clearer image."
      );
    }

    // Log and wrap unexpected errors
    if (telemetry) {
      telemetry.trackException({
        exception: err instanceof Error ? err : new Error(String(err)),
      });
    }

    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to extract text from the document. Please try again."
    );
  }
}
