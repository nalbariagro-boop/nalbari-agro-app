export function errorResponse(error: unknown, fallback: string) {
  console.error(error);

  return Response.json(
    {
      error: fallback,
    },
    { status: 500 }
  );
}
