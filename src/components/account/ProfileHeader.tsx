import { useState } from "react";
import { Mail, Phone, Pencil, Check, X, MapPin, Calendar } from "lucide-react";
import AvatarUpload from "./AvatarUpload";

interface ProfileHeaderProps {
  userId: string;
  displayName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  joinDate: string;
  onSave: (name: string, phone: string) => Promise<void>;
  onAvatarUpdated: () => void;
}

const ProfileHeader = ({ userId, displayName, email, phone, avatarUrl, joinDate, onSave, onAvatarUpdated }: ProfileHeaderProps) => {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setEditName(displayName);
    setEditPhone(phone || "");
    setEditing(true);
  };

  const handleSave = async () => {
    const name = editName.trim().slice(0, 100);
    if (!name) return;
    setSaving(true);
    try {
      await onSave(name, editPhone.trim().slice(0, 20));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Cover gradient */}
      <div className="h-20 sm:h-28 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/10 relative" />
      
      <div className="px-4 sm:px-6 pb-5 -mt-10 sm:-mt-12">
        <div className="flex items-end gap-4">
          <AvatarUpload
            userId={userId}
            avatarUrl={avatarUrl}
            displayName={displayName}
            onUploaded={onAvatarUpdated}
          />
          {!editing && (
            <button
              onClick={startEditing}
              className="ml-auto mb-1 p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-muted shrink-0"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>

        {!editing ? (
          <div className="mt-3 space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">{displayName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail size={13} /> {email}</span>
              {phone && <span className="flex items-center gap-1.5"><Phone size={13} /> {phone}</span>}
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                Member since {new Date(joinDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Edit Profile</h2>
              <button onClick={() => setEditing(false)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted border border-border focus:border-primary outline-none text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  maxLength={20}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted border border-border focus:border-primary outline-none text-sm transition-colors"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 px-6 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Check size={15} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
