import { PointerEvent, useEffect, useRef, useState } from 'react';
import Modal from './Modal';
export default function SignatureModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (signature: string) => Promise<void> }) {
  const canvas = useRef<HTMLCanvasElement>(null); const [drawing,setDrawing]=useState(false); const [signed,setSigned]=useState(false); const [saving,setSaving]=useState(false);
  useEffect(()=>{const c=canvas.current;if(!c)return;const ctx=c.getContext('2d')!;ctx.lineWidth=2.2;ctx.lineCap='round';ctx.strokeStyle='#173b63';ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height)},[]);
  const point=(e:PointerEvent<HTMLCanvasElement>)=>{const c=canvas.current!,r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}};
  const down=(e:PointerEvent<HTMLCanvasElement>)=>{e.currentTarget.setPointerCapture(e.pointerId);const p=point(e),ctx=canvas.current!.getContext('2d')!;ctx.beginPath();ctx.moveTo(p.x,p.y);setDrawing(true);setSigned(true)};
  const move=(e:PointerEvent<HTMLCanvasElement>)=>{if(!drawing)return;const p=point(e),ctx=canvas.current!.getContext('2d')!;ctx.lineTo(p.x,p.y);ctx.stroke()};const clear=()=>{const c=canvas.current!,ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);setSigned(false)};
  async function confirm(){if(!signed)return;setSaving(true);try{await onConfirm(canvas.current!.toDataURL('image/png'));onClose()}finally{setSaving(false)}}
  return <Modal title="Assinatura de recebimento" onClose={onClose}><p className="muted">O colaborador deve assinar abaixo para confirmar o recebimento do EPI.</p><canvas ref={canvas} width="900" height="300" className="signature-pad" onPointerDown={down} onPointerMove={move} onPointerUp={()=>setDrawing(false)} onPointerLeave={()=>setDrawing(false)}/><div className="signature-actions"><button type="button" className="link-button" onClick={clear}>Limpar</button><button className="btn primary" disabled={!signed||saving} onClick={confirm}>{saving?'Registrando…':'Confirmar assinatura'}</button></div><small>Data e hora da confirmação são registradas no histórico operacional.</small></Modal>;
}
