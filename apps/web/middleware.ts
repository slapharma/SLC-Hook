import { NextRequest, NextResponse } from "next/server";
import { verifyRequestOrigin } from "lucia";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (request.method === "GET") return NextResponse.next();

  // CSRF protection for non-GET state-changing requests
  const originHeader = request.headers.get("Origin");
  const hostHeader = request.headers.get("Host");
  if (
    !originHeader ||
    !hostHeader ||
    !verifyRequestOrigin(originHeader, [hostHeader])
  ) {
    return new NextResponse(null, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
