"use client";

import type { GetPaymentCommandResult, GetInvoiceResult, InvoiceResult, ParseInvoiceResult } from "@nervosnetwork/fiber-js";

const RECENT_PAYMENTS_KEY = "fiber_recent_payments";
const RECENT_INVOICES_KEY = "fiber_recent_invoices";
const MAX_RECENT_ITEMS = 10;

export interface RecentPaymentItem {
  paymentHash: `0x${string}`;
  status: string;
  fee: string;
  mode: "invoice" | "keysend" | "lookup";
  invoice?: string;
  targetPubkey?: string;
  amount?: string;
  failedError?: string;
  updatedAt: number;
}

export interface RecentInvoiceItem {
  paymentHash: `0x${string}`;
  status: string;
  amount?: string;
  invoice?: string;
  invoiceAddress?: string;
  description?: string;
  source: "create" | "lookup" | "parse";
  updatedAt: number;
}

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T[] : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

export function getRecentPayments(): RecentPaymentItem[] {
  return readList<RecentPaymentItem>(RECENT_PAYMENTS_KEY);
}

export function saveRecentPayment(item: RecentPaymentItem) {
  const existing = getRecentPayments();
  const deduped = existing.filter((entry) => entry.paymentHash !== item.paymentHash);
  writeList(RECENT_PAYMENTS_KEY, [item, ...deduped].slice(0, MAX_RECENT_ITEMS));
}

export function getRecentInvoices(): RecentInvoiceItem[] {
  return readList<RecentInvoiceItem>(RECENT_INVOICES_KEY);
}

export function saveRecentInvoice(item: RecentInvoiceItem) {
  const existing = getRecentInvoices();
  const deduped = existing.filter((entry) => entry.paymentHash !== item.paymentHash);
  writeList(RECENT_INVOICES_KEY, [item, ...deduped].slice(0, MAX_RECENT_ITEMS));
}

export function paymentItemFromResult(
  result: GetPaymentCommandResult,
  extras: Omit<RecentPaymentItem, "paymentHash" | "status" | "fee" | "failedError" | "updatedAt">,
): RecentPaymentItem {
  return {
    paymentHash: result.payment_hash,
    status: result.status,
    fee: result.fee,
    failedError: result.failed_error,
    updatedAt: Date.now(),
    ...extras,
  };
}

export function invoiceItemFromCreatedResult(
  result: InvoiceResult,
  description?: string,
): RecentInvoiceItem {
  return {
    paymentHash: result.invoice.data.payment_hash,
    status: "Open",
    amount: result.invoice.amount,
    invoice: result.invoice_address,
    invoiceAddress: result.invoice_address,
    description,
    source: "create",
    updatedAt: Date.now(),
  };
}

export function invoiceItemFromLookupResult(
  result: GetInvoiceResult,
  source: "lookup" | "parse" = "lookup",
): RecentInvoiceItem {
  const descriptionAttr = result.invoice.data.attrs.find(
    (attr): attr is { Description: string } => "Description" in attr,
  );

  return {
    paymentHash: result.invoice.data.payment_hash,
    status: result.status,
    amount: result.invoice.amount,
    invoiceAddress: undefined,
    invoice: undefined,
    description: descriptionAttr?.Description,
    source,
    updatedAt: Date.now(),
  };
}

export function invoiceItemFromParsedResult(
  result: ParseInvoiceResult,
  rawInvoice: string,
): RecentInvoiceItem {
  const descriptionAttr = result.invoice.data.attrs.find(
    (attr): attr is { Description: string } => "Description" in attr,
  );

  return {
    paymentHash: result.invoice.data.payment_hash,
    status: "Open",
    amount: result.invoice.amount,
    invoice: rawInvoice,
    invoiceAddress: undefined,
    description: descriptionAttr?.Description,
    source: "parse",
    updatedAt: Date.now(),
  };
}
