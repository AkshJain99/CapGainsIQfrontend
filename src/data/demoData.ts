import type { Asset, Transaction } from '../types';
import { genId } from '../utils';

export const DEMO_ASSETS: Asset[] = [
  { id: genId(), asset_name: 'NIFTYBEES',    asset_class: 'EQUITY', ticker: 'NIFTYBEES.NS',  source: 'YF' },
  { id: genId(), asset_name: 'GOLDBEES',     asset_class: 'EQUITY', ticker: 'GOLDBEES.NS',   source: 'YF' },
  { id: genId(), asset_name: 'JUNIORBEES',   asset_class: 'EQUITY', ticker: 'JUNIORBEES.NS', source: 'YF' },
  { id: genId(), asset_name: 'HDFCNIFTY',    asset_class: 'EQUITY', ticker: 'HDFCNIFTY.NS',  source: 'YF' },
  { id: genId(), asset_name: 'LIQUIDBEES',   asset_class: 'DEBT',   ticker: 'LIQUIDBEES.NS', source: 'YF' },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  // NIFTYBEES — two buys, one sell (LTCG scenario)
  {
    id: genId(), asset_name: 'NIFTYBEES', date: '10-04-2022',
    tr_type: 'Buy', rate: 185.50, quantity: 100,
    amount: 18550, brokerage: 20, gst: 3.6, stt: 18.55,
    sebi_tax: 0.05, exchange_charges: 2.5, stamp_duty: 9,
    other_charges: 0, ipft_charges: 0, total_charges: 53.7,
  },
  {
    id: genId(), asset_name: 'NIFTYBEES', date: '15-09-2023',
    tr_type: 'Buy', rate: 212.40, quantity: 50,
    amount: 10620, brokerage: 15, gst: 2.7, stt: 10.62,
    sebi_tax: 0.03, exchange_charges: 1.5, stamp_duty: 5,
    other_charges: 0, ipft_charges: 0, total_charges: 34.85,
  },
  {
    id: genId(), asset_name: 'NIFTYBEES', date: '20-01-2025',
    tr_type: 'Sell', rate: 248.60, quantity: 80,
    amount: 19888, brokerage: 20, gst: 3.6, stt: 19.89,
    sebi_tax: 0.05, exchange_charges: 2.5, stamp_duty: 0,
    other_charges: 0, ipft_charges: 0, total_charges: 46.04,
  },
  // GOLDBEES — buy and sell (LTCG scenario)
  {
    id: genId(), asset_name: 'GOLDBEES', date: '01-06-2022',
    tr_type: 'Buy', rate: 48.20, quantity: 200,
    amount: 9640, brokerage: 15, gst: 2.7, stt: 9.64,
    sebi_tax: 0.02, exchange_charges: 1.2, stamp_duty: 4.5,
    other_charges: 0, ipft_charges: 0, total_charges: 33.06,
  },
  {
    id: genId(), asset_name: 'GOLDBEES', date: '20-03-2024',
    tr_type: 'Sell', rate: 63.80, quantity: 100,
    amount: 6380, brokerage: 15, gst: 2.7, stt: 6.38,
    sebi_tax: 0.02, exchange_charges: 1, stamp_duty: 0,
    other_charges: 0, ipft_charges: 0, total_charges: 25.1,
  },
  // JUNIORBEES — buy only (unrealised gains)
  {
    id: genId(), asset_name: 'JUNIORBEES', date: '15-11-2023',
    tr_type: 'Buy', rate: 68.40, quantity: 150,
    amount: 10260, brokerage: 15, gst: 2.7, stt: 10.26,
    sebi_tax: 0.03, exchange_charges: 1.3, stamp_duty: 5,
    other_charges: 0, ipft_charges: 0, total_charges: 34.29,
  },
  // HDFCNIFTY — recent buy (STCG if sold now)
  {
    id: genId(), asset_name: 'HDFCNIFTY', date: '10-01-2025',
    tr_type: 'Buy', rate: 182.30, quantity: 100,
    amount: 18230, brokerage: 20, gst: 3.6, stt: 18.23,
    sebi_tax: 0.05, exchange_charges: 2.3, stamp_duty: 9,
    other_charges: 0, ipft_charges: 0, total_charges: 53.18,
  },
  // LIQUIDBEES — debt fund (different threshold)
  {
    id: genId(), asset_name: 'LIQUIDBEES', date: '01-07-2022',
    tr_type: 'Buy', rate: 1000.10, quantity: 20,
    amount: 20002, brokerage: 10, gst: 1.8, stt: 0,
    sebi_tax: 0.01, exchange_charges: 0.5, stamp_duty: 0,
    other_charges: 0, ipft_charges: 0, total_charges: 12.31,
  },
];
