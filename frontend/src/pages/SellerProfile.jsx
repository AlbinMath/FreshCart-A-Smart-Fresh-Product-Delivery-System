import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function SellerProfile() {
  const {
    getUserProfile,
    fetchUserProfile,
    listBranchStores,
    deleteBranchStore,
    upgradeToSeller,
    listBranchLinkRequests,
    actOnBranchLinkRequest,
    listNotifications,
    markNotificationRead,
  } = useAuth();
  const navigate = useNavigate();

  const profile = useMemo(() => getUserProfile() || {}, [getUserProfile]);
  const [sellerIdLocal, setSellerIdLocal] = useState(profile?.sellerUniqueNumber || "—");
  const [branches, setBranches] = useState([]);
  const [linkedFrom, setLinkedFrom] = useState([]); // sellers who linked this account
  const [linkedProfiles, setLinkedProfiles] = useState([]); // expanded profiles for linked sellers
  const [pendingRequests, setPendingRequests] = useState([]); // incoming requests to this seller
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showIdModal, setShowIdModal] = useState(false);
  const [notif, setNotif] = useState({ unread: 0, items: [] });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Ensure latest profile (to read sellerUniqueNumber)
        const backendUser = await fetchUserProfile();
        if (backendUser?.sellerUniqueNumber) {
          setSellerIdLocal(backendUser.sellerUniqueNumber);
        } else if (['seller','store','customer'].includes(backendUser?.role)) {
          try {
            await upgradeToSeller({}); // idempotent; will only set ID if missing
            const latest = await fetchUserProfile();
            if (latest?.sellerUniqueNumber) setSellerIdLocal(latest.sellerUniqueNumber);
          } catch (genErr) {
            console.warn('Auto-generate seller ID failed:', genErr?.message || genErr);
          }
        }
        const list = await listBranchStores();
        if (list && Array.isArray(list.branchStores)) setBranches(list.branchStores);
        if (list && Array.isArray(list.linkedBranchOf)) setLinkedFrom(list.linkedBranchOf);
        if (list && Array.isArray(list.linkedProfiles)) setLinkedProfiles(list.linkedProfiles);
        if (Array.isArray(list?.pendingRequests)) setPendingRequests(list.pendingRequests);
        if (list && list.seller && list.seller.sellerUniqueNumber) setSellerIdLocal(list.seller.sellerUniqueNumber);

        // Also fetch via direct API (redundant but ensures latest)
        try {
          const reqs = await listBranchLinkRequests();
          if (Array.isArray(reqs)) setPendingRequests(reqs);
        } catch {}

        // Fetch notifications (simple bar)
        try {
          const notes = await listNotifications();
          const unread = (notes || []).filter(n => !n.read).length;
          setNotif({ unread, items: notes || [] });
        } catch {}
      } catch (e) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);





  const onDelete = async (idx) => {
    if (!window.confirm("Remove this branch store?")) return;
    setError("");
    setInfo("");
    try {
      setSaving(true);
      const updated = await deleteBranchStore(idx);
      setBranches(updated);
      setInfo("Branch removed");
    } catch (e1) {
      setError(e1.message || "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const sellerId = sellerIdLocal;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Seller Profile</h1>
          <button onClick={() => navigate(-1)} className="px-4 py-2 border rounded-lg">Back</button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          {/* Notification bar */}
          {!!notif.items.length && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Notifications {notif.unread ? `(${notif.unread} unread)` : ''}</div>
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={async () => {
                    // mark top 5 unread as read
                    const toMark = notif.items.filter(n => !n.read).slice(0,5);
                    for (const n of toMark) { try { await markNotificationRead(n._id); } catch {} }
                    const fresh = await listNotifications();
                    setNotif({ unread: (fresh||[]).filter(n => !n.read).length, items: fresh||[] });
                  }}
                >Mark some read</button>
              </div>
              <div className="mt-2 space-y-2 max-h-40 overflow-auto">
                {notif.items.slice(0,5).map(n => (
                  <div key={n._id} className={`text-xs ${n.read ? 'text-gray-500' : 'text-gray-800'}`}>
                    <span className="font-medium">{n.title}:</span> {n.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller Unique Number (read-only) */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Seller Unique Number</div>
                <div className="mt-1 text-lg font-semibold">{sellerId}</div>
              </div>
              <div className="flex items-center gap-2">
                {(!sellerId || sellerId === '—') && (
                  <button
                    type="button"
                    onClick={async () => {
                      setError(""); setInfo("");
                      try {
                        // trigger idempotent upgrade to backfill missing sellerUniqueNumber
                        await upgradeToSeller({});
                        const latest = await fetchUserProfile();
                        if (latest?.sellerUniqueNumber) {
                          setSellerIdLocal(latest.sellerUniqueNumber);
                          setInfo('Seller ID generated');
                        } else {
                          setError('Failed to generate Seller ID');
                        }
                      } catch (e) {
                        setError(e.message || 'Failed to generate Seller ID');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                  >Generate Seller ID</button>
                )}
                <button
                  type="button"
                  onClick={() => setShowIdModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs hover:bg-black"
                  disabled={!sellerId || sellerId === '—'}
                  title={!sellerId || sellerId === '—' ? 'Generate ID first' : ''}
                >View ID</button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">This ID is auto-generated when your account is upgraded to seller. It is non-editable.</p>
          </div>

          {/* Store Info quick view */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Store Name</div>
              <div className="text-sm font-medium">{profile?.storeName || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Main Store Address</div>
              <div className="text-sm font-medium break-words">{profile?.storeAddress || "—"}</div>
            </div>
          </div>

          {/* Branch Stores Manager */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Branch Stores</h2>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">Manage your branch stores</div>
              <button
                type="button"
                onClick={() => setShowAddBranch(v => !v)}
                className="px-3 py-1.5 rounded-lg text-xs border bg-white hover:bg-gray-50"
              >{showAddBranch ? 'Hide Add Form' : 'Add Another Branch'}</button>
            </div>

            {showAddBranch && (
              <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Branch name (e.g., same as Store Name or location)"
                  className="md:col-span-2 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  placeholder="Branch address"
                  className="md:col-span-3 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  name="linkedSellerUniqueNumber"
                  value={form.linkedSellerUniqueNumber}
                  onChange={onChange}
                  placeholder="(Optional) Existing Seller Unique No."
                  className="md:col-span-5 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="md:col-span-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:bg-green-400"
                  >{saving ? 'Saving…' : 'Add Branch'}</button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="text-sm text-gray-500">Loading branches…</div>
            ) : (
              <div className="space-y-6">
                {/* My branches */}
                <div>
                  <div className="text-sm font-semibold mb-2">My Branches</div>
                  {(Array.isArray(branches.branchStores) ? branches.branchStores : branches).length === 0 && !(linkedFrom && linkedFrom.length) && (
                    <div className="text-sm text-gray-500">No branch stores added yet.</div>
                  )}

                  {/* Outgoing branches I created */}
                  {(Array.isArray(branches.branchStores) ? branches.branchStores : branches).map((b, i) => (
                    <div key={`mine-${i}`} className="flex items-start justify-between border rounded-xl p-4">
                      <div>
                        <div className="text-sm font-semibold">{b.name}</div>
                        <div className="text-xs text-gray-600 break-words">{b.address}</div>
                        {b.linkedSellerUniqueNumber && (
                          <div className="text-[11px] text-blue-600 mt-1">
                            Linked seller: {b.linkedSellerUniqueNumber}
                            {Array.isArray(linkedProfiles) && linkedProfiles.find(p => p.sellerUniqueNumber === b.linkedSellerUniqueNumber) && (
                              <span className="text-gray-600">
                                {' '}— {
                                  (linkedProfiles.find(p => p.sellerUniqueNumber === b.linkedSellerUniqueNumber)?.storeName)
                                  || (linkedProfiles.find(p => p.sellerUniqueNumber === b.linkedSellerUniqueNumber)?.name)
                                  || ''
                                }
                                {(() => {
                                  const lp = Array.isArray(linkedProfiles) ? linkedProfiles.find(p => p.sellerUniqueNumber === b.linkedSellerUniqueNumber) : null;
                                  return lp?.storeAddress ? `, ${lp.storeAddress}` : '';
                                })()}
                              </span>
                            )}
                            <span className="ml-2 inline-block px-2 py-0.5 text-[10px] rounded bg-green-100 text-green-700 align-middle">Accepted</span>
                          </div>
                        )}
                        {!b.linkedSellerUniqueNumber && form.linkedSellerUniqueNumber && (
                          <div className="text-[11px] text-amber-600 mt-1">Pending link: waiting for seller approval</div>
                        )}
                        <div className="text-[10px] text-gray-400 mt-1">Added {new Date(b.createdAt || Date.now()).toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => onDelete(i)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-xs hover:bg-red-50"
                      >Delete</button>
                    </div>
                  ))}

                  {/* Reverse links: show here as part of My Branches so both accounts see something */}
                  {(linkedFrom || []).map((lb, idx) => {
                    const main = Array.isArray(linkedProfiles) ? linkedProfiles.find(p => p.sellerUniqueNumber === lb.sellerUniqueNumber) : null;
                    return (
                      <div key={`rev-${idx}`} className="flex items-start justify-between border rounded-xl p-4">
                        <div>
                          <div className="text-sm font-semibold">{lb.branchName || 'Linked Branch'}</div>
                          {lb.branchAddress && <div className="text-xs text-gray-600 break-words">{lb.branchAddress}</div>}
                          <div className="text-[11px] text-blue-600 mt-1">
                            Main seller: {lb.sellerUniqueNumber}
                            {main && (
                              <span className="text-gray-600"> {' '}— {(main.storeName || main.name || '')}{main.storeAddress ? `, ${main.storeAddress}` : ''}</span>
                            )}
                            <span className="ml-2 inline-block px-2 py-0.5 text-[10px] rounded bg-green-100 text-green-700 align-middle">Accepted</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Incoming requests to link (from other sellers) */}
                {!!(pendingRequests && pendingRequests.length) && (
                  <div>
                    <div className="text-sm font-semibold mb-2">Pending Requests</div>
                    {pendingRequests.map((r) => (
                      <div key={r._id} className="flex items-start justify-between border rounded-xl p-4 bg-yellow-50">
                        <div>
                          <div className="text-sm font-medium">From: {r.requesterSellerUniqueNumber}</div>
                          <div className="text-xs text-gray-600">Branch: {r.branchName}</div>
                          <div className="text-xs text-gray-600 break-words">Address: {r.branchAddress}</div>
                          {!!r.requesterStoreName && (
                            <div className="text-[11px] text-gray-500 mt-1">Store: {r.requesterStoreName}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async() => { setSaving(true); setError(''); setInfo(''); try { await actOnBranchLinkRequest(r._id, 'accept'); setInfo('Request accepted'); setPendingRequests(prev => prev.filter(x => x._id !== r._id)); const refreshed = await listBranchStores(); if (refreshed?.branchStores) setBranches(refreshed.branchStores); if (Array.isArray(refreshed?.linkedProfiles)) setLinkedProfiles(refreshed.linkedProfiles); } catch(e){ setError(e.message || 'Failed'); } finally { setSaving(false); } }}
                            className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                          >Accept</button>
                          <button
                            onClick={async() => { setSaving(true); setError(''); setInfo(''); try { await actOnBranchLinkRequest(r._id, 'deny'); setInfo('Request denied'); setPendingRequests(prev => prev.filter(x => x._id !== r._id)); } catch(e){ setError(e.message || 'Failed'); } finally { setSaving(false); } }}
                            className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-xs hover:bg-red-50"
                          >Deny</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Linked as branch of other sellers */}
                {!!(linkedFrom && linkedFrom.length) && (
                  <div>
                    <div className="text-sm font-semibold mb-2">Linked To Other Sellers</div>
                    {(linkedFrom || []).map((lb, idx) => {
                      const main = Array.isArray(linkedProfiles) ? linkedProfiles.find(p => p.sellerUniqueNumber === lb.sellerUniqueNumber) : null;
                      return (
                        <div key={idx} className="border rounded-xl p-4">
                          <div className="text-xs text-gray-500">Main Seller</div>
                          <div className="text-sm font-medium">{lb.sellerUniqueNumber}</div>
                          {main && (
                            <div className="text-[11px] text-gray-600 mt-1">
                              {(main.storeName || main.name || '')}{main.storeAddress ? ` — ${main.storeAddress}` : ''}
                            </div>
                          )}
                          {lb.branchName && <div className="text-xs">Branch name: {lb.branchName}</div>}
                          {lb.branchAddress && <div className="text-xs">Branch address: {lb.branchAddress}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {(error || info) && (
              <div className={`mt-2 text-sm ${error ? 'text-red-600' : 'text-green-600'}`}>
                {error || info}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seller ID Modal */}
      {showIdModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Seller Unique Number</h3>
              <button onClick={() => setShowIdModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold tracking-wider">{sellerId}</div>
              <p className="text-xs text-gray-500 mt-2">This is your non-editable seller identifier.
                It’s assigned automatically when your account becomes a seller.</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowIdModal(false)} className="px-4 py-2 rounded-lg bg-green-600 text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}