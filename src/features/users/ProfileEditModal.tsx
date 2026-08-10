import React, { useState, useEffect } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { Button, Input } from "../../components/ui/CoreUI";
import { apiRequest } from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { UserProfile } from "../../types/user";
import { toast } from "sonner";

export const ProfileEditModal = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated?: (updatedProfile: Partial<UserProfile>) => void;
}) => {
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || "",
  );
  const [username, setUsername] = useState(userProfile?.username || "");
  const [email, setEmail] = useState(userProfile?.email || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(userProfile?.displayName || "");
      setUsername(userProfile?.username || "");
      setEmail(userProfile?.email || "");
      setPhone(userProfile?.phone || "");
    }
  }, [isOpen, userProfile]);

  const handleUpdateProfile = async () => {
    const docId = userProfile?.id || userProfile?.uid;
    if (!docId) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/profile/update`, {
        method: "PUT",
        body: { 
          displayName, 
          username, 
          email, 
          phone, 
          currentPassword: currentPassword || undefined, 
          newPassword: newPassword || undefined 
        },
      });

      if (onProfileUpdated) {
        onProfileUpdated({
          displayName,
          username,
          email,
          phone,
        });
      }

      toast.success("Profile updated successfully.");
      onClose();
    } catch (error: any) {
      console.error("Error updating profile", error);
      const errorMessage = error.message || "Failed to update profile";
      if (errorMessage === "Password lama yang Anda masukkan salah!") {
        setError(errorMessage);
      } else {
        toast.error(`Failed to update profile: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profil">
      <div className="space-y-6">
        <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="w-16 h-16 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 text-2xl font-bold shadow-sm">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {displayName}
            </p>
            <p className="text-xs text-slate-500">{email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nama Lengkap
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Email
            </label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nomor Telepon
            </label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h4 className="text-sm font-bold text-slate-800">Ubah Password</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Password Lama
              </label>
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
                className="pr-10"
              />
              {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
              <button
                type="button"
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="space-y-1 relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Password Baru
              </label>
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpdateProfile}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium transition-all disabled:opacity-50"
        >
          {loading ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};


