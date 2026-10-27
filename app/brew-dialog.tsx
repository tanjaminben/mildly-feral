"use client";
import { useEffect,useRef,type ReactNode } from "react";
import { X } from "lucide-react";
export default function BrewDialog({title,children,onClose,focusSelector}:{title:string;children:ReactNode;onClose:()=>void;focusSelector?:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;const el=ref.current;el?.showModal();(focusSelector?el?.querySelector<HTMLElement>(focusSelector):el?.querySelector<HTMLElement>("input,select,textarea"))?.focus();return()=>{el?.close();if(previous?.isConnected)previous.focus();};},[]);
  return <dialog ref={ref} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}}><header className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22}/></button></header>{children}</dialog>;
}
