/**
 * Optional backend bridge for company logos.
 *
 * The demo has no API configured, so the data URL is stored with the partner
 * record in the local demo store. When `NEXT_PUBLIC_API_URL` is set, the logo
 * is uploaded through the backend's `/uploads/logo` endpoint instead and its
 * hosted URL is saved. A failed upload falls back to the local data URL so
 * the UI keeps working offline.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export async function uploadCompanyLogo(input: {
  name: string;
  dataUrl: string;
  partnerId: string;
}): Promise<string> {
  if (!API_BASE) return input.dataUrl;

  try {
    const response = await fetch(`${API_BASE}/uploads/logo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Logo upload failed (${response.status})`);
    const data = (await response.json()) as { logoUrl?: string };
    if (!data.logoUrl) throw new Error("Logo upload returned no URL");
    return data.logoUrl;
  } catch (error) {
    console.warn("Company logo upload fell back to local storage:", error);
    return input.dataUrl;
  }
}
