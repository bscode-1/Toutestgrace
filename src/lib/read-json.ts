export async function readJson(res: Response) {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const fallback =
      res.status === 401 || res.status === 403
        ? "This user cannot do this"
        : "Something went wrong, please try again";
    throw new Error(typeof data?.error === "string" ? data.error : fallback);
  }
  return data;
}