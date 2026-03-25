import React, { useState } from 'react';
import { X, Users, Plus, Search, Check, Trash2 } from 'lucide-react';

export default function PartyModal({ isOpen, onClose, user, parties, myParty, onCreateParty, onJoinParty, onInvitePlayer, onApproveJoinRequest, onAcceptInvitation, onDeclineInvitation, players }: any) {
  const [partyName, setPartyName] = useState('');
  const [partyDesc, setPartyDesc] = useState('');
  const [approvalType, setApprovalType] = useState<'auto' | 'manual'>('auto');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/80 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2"><Users className="text-emerald-500" /> Party System</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100"><X /></button>
        </div>

        {myParty ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-100">{myParty.name}</h3>
            <p className="text-zinc-400 text-sm">{myParty.description}</p>
            <div className="bg-zinc-950 p-4 rounded-lg">
              <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Members ({myParty.members.length}/4)</h4>
              {myParty.members.map((m: any) => <div key={m.id} className="text-zinc-300 text-sm">{m.name} {m.id === myParty.leaderId && '(Leader)'}</div>)}
            </div>
            {myParty.leaderId === user.uid && (
              <div className="mt-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Join Requests</h4>
                {myParty.joinRequests?.map((req: any) => (
                  <div key={req.playerId} className="flex justify-between items-center bg-zinc-800 p-2 rounded">
                    <span className="text-zinc-300 text-sm">{req.playerName}</span>
                    <button onClick={() => onApproveJoinRequest(req.playerId)} className="text-emerald-500 text-xs font-bold">Approve</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-sm font-bold text-zinc-100 mb-3">Create Party</h3>
              <input type="text" placeholder="Party Name" value={partyName} onChange={(e) => setPartyName(e.target.value)} className="w-full bg-zinc-950 text-zinc-100 p-2 rounded mb-2 text-sm" />
              <input type="text" placeholder="Description" value={partyDesc} onChange={(e) => setPartyDesc(e.target.value)} className="w-full bg-zinc-950 text-zinc-100 p-2 rounded mb-2 text-sm" />
              <select value={approvalType} onChange={(e) => setApprovalType(e.target.value as any)} className="w-full bg-zinc-950 text-zinc-100 p-2 rounded mb-3 text-sm">
                <option value="auto">Auto Approval</option>
                <option value="manual">Manual Approval</option>
              </select>
              <button onClick={() => onCreateParty(partyName, partyDesc, approvalType)} className="w-full bg-emerald-600 text-white py-2 rounded text-sm font-bold">Create</button>
            </div>
            
            <div className="bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-sm font-bold text-zinc-100 mb-3">Find Party</h3>
              {parties.filter(p => p.members.length < 4).map(p => (
                <div key={p.id} className="flex justify-between items-center bg-zinc-950 p-2 rounded mb-2">
                  <div>
                    <div className="text-zinc-100 text-sm font-bold">{p.name}</div>
                    <div className="text-zinc-500 text-xs">{p.description} ({p.members.length}/4)</div>
                  </div>
                  <button onClick={() => onJoinParty(p.id)} className="text-emerald-500 text-xs font-bold">Join</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
