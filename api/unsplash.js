/**
 * WallpaperHub — Unsplash server-side proxy.
 * Required Vercel Environment Variable:
 *   UNSPLASH_ACCESS_KEY
 */

module.exports = async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
        return res.status(500).json({
            error: "UNSPLASH_ACCESS_KEY is not configured"
        });
    }

    const query = String(req.query.query || "wallpaper").trim().slice(0, 80);
    const page = Math.max(1, Math.min(Number(req.query.page) || 1, 100));
    const perPage = Math.max(1, Math.min(Number(req.query.per_page) || 12, 30));
    const orderBy = req.query.order_by === "relevant" ? "relevant" : "latest";

    const params = new URLSearchParams({
        query: query || "wallpaper",
        page: String(page),
        per_page: String(perPage),
        order_by: orderBy,
        orientation: "portrait",
        content_filter: "high"
    });

    try {
        const response = await fetch(
            "https://api.unsplash.com/search/photos?" + params.toString(),
            {
                headers: {
                    "Authorization": "Client-ID " + accessKey,
                    "Accept-Version": "v1",
                    "Accept": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Unsplash request failed",
                details: data && data.errors ? data.errors : undefined
            });
        }

        const results = (data.results || []).map(photo => ({
            id: photo.id,
            width: photo.width,
            height: photo.height,
            alt_description: photo.alt_description,
            description: photo.description,
            urls: {
                small: photo.urls && photo.urls.small,
                regular: photo.urls && photo.urls.regular,
                full: photo.urls && photo.urls.full
            },
            links: {
                html: photo.links && photo.links.html,
                download_location:
                    photo.links && photo.links.download_location
            },
            user: {
                name: photo.user && photo.user.name,
                username: photo.user && photo.user.username,
                profile_url:
                    photo.user &&
                    photo.user.links &&
                    photo.user.links.html
            }
        }));

        res.setHeader(
            "Cache-Control",
            "s-maxage=300, stale-while-revalidate=600"
        );

        return res.status(200).json({
            total: data.total || 0,
            total_pages: data.total_pages || 0,
            page,
            results
        });

    } catch (error) {
        console.error("Unsplash proxy error:", error);
        return res.status(502).json({
            error: "Unable to reach Unsplash"
        });
    }
};
