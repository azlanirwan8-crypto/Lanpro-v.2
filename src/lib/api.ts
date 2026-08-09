import { toast } from "sonner";

/**
 * LanPro v1.3 - Centralized API Service with JWT & Conflict Handling
 */


export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const getAuthToken = () => {
    return localStorage.getItem("lanpro_jwt_token");
};

export const setAuthToken = (token: string) => {
    localStorage.setItem("lanpro_jwt_token", token);
};

export const clearAuthToken = () => {
    localStorage.removeItem("lanpro_jwt_token");
    localStorage.removeItem("sessionUser");
    sessionStorage.removeItem("sessionUser");
    localStorage.removeItem("isAdminMode");
    sessionStorage.removeItem("isAdminMode");
};

interface FetchOptions extends RequestInit {
    body?: any;
}

export async function apiRequest(url: string, options: FetchOptions = {}, retries = 3, backoff = 1000): Promise<any> {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});
    
    // Prevent Vercel Edge Caching for all API requests to ensure fresh data
    headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    headers.set("Pragma", "no-cache");
    
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    
    const fetchOptions: RequestInit = {
        ...options,
        headers
    };

    if (options.body && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
        fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }
    
    let response: Response;
    try {
        response = await fetch(url, fetchOptions);
    } catch (fetchErr: any) {
        if (retries > 0) {
            console.warn(`Network request failed for ${url} (${fetchErr?.message || 'Failed to fetch'}). Retrying in ${backoff}ms... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return apiRequest(url, options, retries - 1, backoff * 1.5);
        }
        throw new ApiError("Gagal terhubung ke server. Silakan periksa koneksi internet Anda.", 503, { networkError: true, rawMessage: fetchErr?.message });
    }
    
    if (response.status === 429 && retries > 0 && !url.includes("/api/auth/")) {
        console.warn(`Rate limited (429) for ${url}. Retrying in ${backoff}ms...`);
        
        // Dispatch centralized rate limit status event for any global listener
        window.dispatchEvent(new CustomEvent("rate_limit_status", {
            detail: { active: true, url, backoff, retriesLeft: retries }
        }));

        toast.warning(`Permintaan terlalu cepat (429). Menghubungi server dalam ${(backoff / 1000).toFixed(1)} detik...`, {
            id: `rate-limit-${url}`,
            duration: backoff + 1000
        });

        await new Promise(resolve => setTimeout(resolve, backoff));
        
        try {
            const retryRes = await apiRequest(url, options, retries - 1, backoff * 2);
            
            // Clean up status on success
            window.dispatchEvent(new CustomEvent("rate_limit_status", {
                detail: { active: false, url }
            }));
            toast.success(`Berhasil terhubung kembali ke server!`, {
                id: `rate-limit-${url}`,
                duration: 2000
            });
            
            return retryRes;
        } catch (err) {
            window.dispatchEvent(new CustomEvent("rate_limit_status", {
                detail: { active: false, url, failed: true }
            }));
            throw err;
        }
    } else if (response.status === 429 && retries === 0) {
        window.dispatchEvent(new CustomEvent("rate_limit_status", {
            detail: { active: false, url, failed: true }
        }));
        toast.error(`Batas percobaan habis. Silakan tunggu beberapa saat lagi.`, {
            id: `rate-limit-${url}`,
            duration: 4000
        });
    } else {
        // Any other non-429 response cleans up active rate-limit status for this URL
        window.dispatchEvent(new CustomEvent("rate_limit_status", {
            detail: { active: false, url }
        }));
    }
    
    // v1.4 Hardening: Check Content-Type before parsing JSON
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    let responseData: any = null;
    if (isJson) {
        responseData = await response.json().catch(() => ({}));
    } else {
        responseData = await response.text().catch(() => "");
    }

    // v1.4: Enhanced Auth & Session Handling
    // v1.5: Only logout on 401 (Unauthenticated). 403 (Forbidden) should just show the error without clearing token.
    if (response.status === 401) {
        if (!url.includes("/api/auth/")) {
            const message = isJson && responseData ? responseData.message : "Sesi berakhir. Silakan login kembali.";
            
            clearAuthToken();
            window.dispatchEvent(new Event("auth_expired"));
            // Trigger a page reload or state change if needed, but for now just throw
            throw new Error(message || "Sesi berakhir. Silakan login kembali.");
        }
    }

    if (!response.ok) {
        let message = `Server error: ${response.status}`;
        let errorData: any = {};
        if (isJson && responseData && typeof responseData === "object") {
            errorData = responseData;
            message = responseData.message || message;
        } else {
            const text = typeof responseData === "string" ? responseData : "";
            if (text.includes("<html>")) {
                if (response.status === 403) {
                    message = "Akun Anda belum aktif. Silakan hubungi admin.";
                } else if (response.status === 401) {
                    message = "Kata sandi atau nama pengguna yang Anda masukkan salah.";
                } else if (response.status === 429) {
                    message = "Terlalu banyak percobaan. Silakan tunggu beberapa saat lagi.";
                } else {
                    message = `Terjadi kesalahan pada server (${response.status}).`;
                }
            } else if (text.trim().length > 0) {
                message = text.trim();
            }
        }
        throw new ApiError(message, response.status, errorData);
    }
    
    return responseData;
}
