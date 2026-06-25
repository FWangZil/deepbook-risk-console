import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import logoUrl from '../media/logo.png';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { DAppKitProvider, useCurrentAccount, useCurrentNetwork, useDAppKit } from '@mysten/dapp-kit-react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { dAppKit } from './dapp-kit.js';
import { projectConfig } from './integrations/config.js';
import {
  buildWalletTransactionPayload,
  createDeepBookClient,
  ensureTransactionDetails,
  extractCreatedObjectId,
  fetchMarketQuote,
  fetchOpenOrders,
  isStaleObjectVersionError,
  normalizeOrderId,
} from './deepbook-client.js';
import { DEFAULT_RISK_INPUT, evaluateRisk, normalizeRiskInput } from './risk-engine.js';
import {
  buildCancelOrderTransaction,
  buildCreatePolicyTransaction,
  buildCreateBalanceManagerTransaction,
  buildDepositSuiTransaction,
  buildGuardedLimitOrderTransaction,
  buildWithdrawSuiTransaction,
} from './guard-tx.js';
import { applyOpenOrderRecovery, loadDemoState, saveDemoState } from './demo-state.js';
import { buildProofLinks } from './proof-links.js';

function Brand() {
  return (
    <div className="brand">
      <img src={logoUrl} alt="DeepBook Risk Console" className="brand-logo" />
      <strong>DeepBook Risk Console</strong>
    </div>
  );
}

const localManagerKey = 'deepbook-risk-console:balance-manager-id';
const defaultForm = {
  midPrice: '3.42',
  orderPrice: '3.76',
  quantity: '1',
  maxNotional: '5',
  minSpreadBps: '50',
  maxBandDistanceBps: '1500',
  inventoryBase: '0.10',
  inventoryQuote: '20',
  maxInventorySkewBps: '7000',
  active: true,
};

function App() {
  return (
    <DAppKitProvider dAppKit={dAppKit}>
      <RiskConsole />
    </DAppKitProvider>
  );
}

function RiskConsole() {
  const dapp = useDAppKit();
  const account = useCurrentAccount();
  const network = useCurrentNetwork();
  const [restoredState] = useState(() => loadDemoState());
  const [form, setForm] = useState(defaultForm);
  const [balanceManagerId, setBalanceManagerId] = useState(
    () => projectConfig.deepBookBalanceManagerId || restoredState.balanceManagerId || localStorage.getItem(localManagerKey) || '',
  );
  const [policyId, setPolicyId] = useState(() => projectConfig.guardPolicyId || restoredState.policyId || '');
  const [orderId, setOrderId] = useState(() => restoredState.orderId || '');
  const [digest, setDigest] = useState(() => restoredState.digest || '');
  const [guardReceiptId, setGuardReceiptId] = useState(() => restoredState.guardReceiptId || '');
  const [log, setLog] = useState(['Connect a Sui wallet to start guarded execution.']);
  const [busy, setBusy] = useState(false);
  const [depositDone, setDepositDone] = useState(() => Boolean(restoredState.depositDone));
  const [orderPlaced, setOrderPlaced] = useState(() => Boolean(restoredState.orderPlaced));
  const [cancelDone, setCancelDone] = useState(() => Boolean(restoredState.cancelDone));
  const [withdrawDone, setWithdrawDone] = useState(() => Boolean(restoredState.withdrawDone));
  const [marketBusy, setMarketBusy] = useState(false);
  const [marketQuote, setMarketQuote] = useState(null);
  const autoFetchedAddress = useRef('');

  const normalized = useMemo(() => normalizeRiskInput({ ...DEFAULT_RISK_INPUT, ...form }), [form]);
  const risk = useMemo(() => evaluateRisk(normalized), [normalized]);
  const hasWallet = Boolean(account?.address);
  const onTestnet = network === 'testnet';
  const hasGuardPackage = Boolean(projectConfig.guardPackageId);
  const hasPolicy = Boolean(policyId);
  const hasManager = Boolean(balanceManagerId);
  const liveOrderReady = hasWallet && onTestnet && hasGuardPackage && hasPolicy && hasManager && !risk.blocked;
  const proofLinks = useMemo(
    () =>
      buildProofLinks({
        config: projectConfig,
        digest,
        balanceManagerId,
        policyId,
        guardReceiptId,
      }),
    [digest, balanceManagerId, policyId, guardReceiptId],
  );
  const decisionPhase = cancelDone ? 'complete' : orderPlaced || orderId ? 'executed' : 'preflight';

  const actionLocks = getActionLocks({
    busy,
    hasWallet,
    onTestnet,
    hasGuardPackage,
    hasPolicy,
    hasManager,
    liveOrderReady,
    orderId,
    cancelDone,
  });
  const demoSteps = getDemoSteps({
    hasWallet,
    onTestnet,
    hasGuardPackage,
    hasPolicy,
    hasManager,
    depositDone,
    orderPlaced,
    orderId,
    cancelDone,
    withdrawDone,
    risk,
  });
  const nextAction = getNextAction({
    hasWallet,
    onTestnet,
    hasGuardPackage,
    hasPolicy,
    hasManager,
    depositDone,
    orderPlaced,
    orderId,
    cancelDone,
    withdrawDone,
    risk,
    busy,
    actions: {
      createPolicy,
      createBalanceManager,
      depositSui,
      placeOrder,
      refreshOrders,
      cancelOrder,
      withdrawSui,
    },
  });

  useEffect(() => {
    saveDemoState(localStorage, {
      balanceManagerId,
      policyId,
      orderId,
      digest,
      guardReceiptId,
      depositDone,
      orderPlaced,
      cancelDone,
      withdrawDone,
    });
  }, [balanceManagerId, policyId, orderId, digest, guardReceiptId, depositDone, orderPlaced, cancelDone, withdrawDone]);

  useEffect(() => {
    if (!hasWallet || !onTestnet) {
      autoFetchedAddress.current = '';
      return;
    }
    if (autoFetchedAddress.current === account.address) return;
    autoFetchedAddress.current = account.address;
    fetchMarketPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWallet, onTestnet, account?.address]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function append(message) {
    setLog((current) => [message, ...current].slice(0, 8));
  }

  async function signTx(label, txFactory, after) {
    if (!account?.address) {
      append('Connect a wallet before signing.');
      return;
    }
    setBusy(true);
    try {
      append(label);
      const client = createDeepBookClient({ address: account.address, balanceManagerId });
      const result = await signFreshTransaction({ client, txFactory });
      if (result.FailedTransaction) {
        throw new Error(result.FailedTransaction.status?.error?.message || 'Transaction failed');
      }
      let txResult = result.Transaction;
      try {
        txResult = await ensureTransactionDetails(client, txResult);
      } catch (error) {
        append(`Confirmed, but transaction detail refresh failed: ${error.message}`);
      }
      setDigest(txResult.digest);
      append(`Confirmed: ${txResult.digest}`);
      await after?.(txResult);
    } catch (error) {
      append(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function signFreshTransaction({ client, txFactory }) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const tx = txFactory(client);
        const payload = await buildWalletTransactionPayload(tx, client, account.address);
        return await dapp.signAndExecuteTransaction({ transaction: payload, network: 'testnet' });
      } catch (error) {
        lastError = error;
        if (!isStaleObjectVersionError(error) || attempt === 1) break;
        append('Wallet used a stale SUI coin version. Rebuilding the transaction with fresh Sui state...');
        await delay(1500);
      }
    }
    throw lastError;
  }

  async function createPolicy() {
    await signTx(
      'Creating shared guard policy object...',
      () => buildCreatePolicyTransaction({ config: projectConfig, guard: normalized }),
      async (txResult) => {
        const created = extractCreatedObjectId(txResult, `${projectConfig.guardPackageId}::deepbook_risk_console::GuardPolicy`);
        if (created) {
          setPolicyId(created);
          append(`GuardPolicy created: ${created}`);
        } else {
          append('Policy transaction confirmed. Set VITE_GUARD_POLICY_ID if the object id was not detected automatically.');
        }
      },
    );
  }

  async function createBalanceManager() {
    await signTx(
      'Creating DeepBook BalanceManager...',
      (client) => buildCreateBalanceManagerTransaction({ deepbookClient: client }),
      async (txResult) => {
        const created = extractCreatedObjectId(txResult, 'BalanceManager');
        if (created) {
          localStorage.setItem(localManagerKey, created);
          setBalanceManagerId(created);
          append(`BalanceManager created: ${created}`);
        } else {
          append('BalanceManager transaction confirmed. Paste the created object id into the manager field.');
        }
      },
    );
  }

  async function depositSui() {
    await signTx(
      'Depositing 1.2 SUI into the BalanceManager...',
      (client) =>
        buildDepositSuiTransaction({
          deepbookClient: client,
          managerKey: projectConfig.deepBookManagerKey,
          coinKey: 'SUI',
          amount: 1.2,
        }),
      async () => {
        setDepositDone(true);
        append('Deposit complete. Next: place the guarded maker ask.');
      },
    );
  }

  async function placeOrder() {
    await signTx(
      'Placing guarded post-only DeepBook maker ask and recording guard receipt...',
      (client) =>
        buildGuardedLimitOrderTransaction({
          deepbookClient: client,
          config: projectConfig,
          policyId,
          guard: normalized,
          risk,
      }),
      async (txResult) => {
        const createdReceipt = extractCreatedObjectId(txResult, `${projectConfig.guardPackageId}::deepbook_risk_console::GuardReceipt`);
        if (createdReceipt) {
          setGuardReceiptId(createdReceipt);
          append(`GuardReceipt created: ${createdReceipt}`);
        }
        setOrderPlaced(true);
        await refreshOrders({ attempts: 5 });
      },
    );
  }

  async function refreshOrders({ attempts = 1 } = {}) {
    if (!account?.address || !balanceManagerId) return;
    setBusy(true);
    try {
      const client = createDeepBookClient({ address: account.address, balanceManagerId });
      let detectedOrderId = '';
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const openOrders = await fetchOpenOrders(client, projectConfig.deepBookPoolKey, projectConfig.deepBookManagerKey);
        detectedOrderId = normalizeOrderId(openOrders?.[0]);
        if (detectedOrderId || attempt === attempts - 1) break;
        await delay(900);
      }
      const recovered = applyOpenOrderRecovery(detectedOrderId);
      setOrderId(recovered.orderId);
      setOrderPlaced(recovered.orderPlaced);
      setCancelDone(recovered.cancelDone);
      append(
        detectedOrderId
          ? `Open order detected: ${detectedOrderId}`
          : 'No open orders found for this manager. If this is a resumed session, cancel is already clear; next: withdraw unused SUI.',
      );
    } catch (error) {
      append(`Open-order refresh failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function fetchMarketPrice() {
    if (!account?.address) {
      append('Connect a wallet before fetching DeepBook market price.');
      return;
    }
    if (!onTestnet) {
      append('Switch the wallet to testnet to read the DeepBook market.');
      return;
    }
    setMarketBusy(true);
    try {
      const client = createDeepBookClient({ address: account.address, balanceManagerId });
      const quote = await fetchMarketQuote(client, { poolKey: projectConfig.deepBookPoolKey });
      setMarketQuote(quote);

      const updates = {};
      if (quote.midPrice != null) {
        updates.midPrice = formatPrice(quote.midPrice);
      }
      const makerAsk = deriveMakerAsk(quote, normalized.minSpreadBps);
      if (makerAsk != null) {
        updates.orderPrice = formatPrice(makerAsk);
      }
      if (Object.keys(updates).length) {
        setForm((current) => ({ ...current, ...updates }));
      }

      append(
        `DeepBook ${projectConfig.deepBookPoolKey} market: mid ${fmt(quote.midPrice)}, best bid ${fmt(quote.bestBid)}, best ask ${fmt(quote.bestAsk)} DBUSDC.`,
      );
      if (makerAsk != null) {
        append(`Maker ask price set to ${formatPrice(makerAsk)} DBUSDC (kept above mid to stay post-only).`);
      }
    } catch (error) {
      append(`Market price fetch failed: ${error.message}`);
    } finally {
      setMarketBusy(false);
    }
  }

  async function cancelOrder() {
    if (!orderId) {
      append('Paste or refresh a protocol order id before canceling.');
      return;
    }
    await signTx('Canceling DeepBook order and recording cancel receipt...', (client) =>
      buildCancelOrderTransaction({
        deepbookClient: client,
        config: projectConfig,
        policyId,
        orderId,
        guard: normalized,
        risk,
      }),
      async (txResult) => {
        const createdReceipt = extractCreatedObjectId(txResult, `${projectConfig.guardPackageId}::deepbook_risk_console::GuardReceipt`);
        if (createdReceipt) {
          setGuardReceiptId(createdReceipt);
          append(`Cancel receipt created: ${createdReceipt}`);
        }
        setCancelDone(true);
        append('Cancel confirmed. Next: withdraw unused SUI from the BalanceManager.');
      },
    );
  }

  async function withdrawSui() {
    await signTx(
      'Withdrawing unused SUI from the BalanceManager back to the connected wallet...',
      (client) =>
        buildWithdrawSuiTransaction({
          deepbookClient: client,
          managerKey: projectConfig.deepBookManagerKey,
          coinKey: 'SUI',
          recipient: account.address,
        }),
      async () => {
        setWithdrawDone(true);
        append('Withdraw complete. Unused SUI returned to the connected wallet.');
      },
    );
  }

  return (
    <main>
      <nav className="topbar">
        <Brand />
        <div className="topbar-right">
          <span>Guarded Sui execution</span>
          <ConnectButton />
        </div>
      </nav>

      <section className="hero">
        <div>
          <h1>Predict risk before a DeepBook maker order leaves your wallet.</h1>
          <p>
            A hybrid Predict Risk Console and LP Guard for SUI/DBUSDC that scores a maker order, gates it
            against guardrails, writes a Sui receipt, and keeps cancel controls one click away.
          </p>
        </div>
        <RiskDecisionBadge risk={risk} phase={decisionPhase} />
      </section>

      <section className="operatorPanel" aria-label="Demo operator">
        <div className="nextAction">
          <span className="eyebrow">Next action</span>
          <h2>{nextAction.title}</h2>
          <p>{nextAction.detail}</p>
          {nextAction.onClick ? (
            <button className="primaryAction" type="button" disabled={nextAction.disabled} onClick={nextAction.onClick}>
              <span>{nextAction.buttonLabel}</span>
              <ArrowRight />
            </button>
          ) : (
            <div className="manualAction">{nextAction.buttonLabel}</div>
          )}
        </div>
        <div className="demoSteps">
          {demoSteps.map((step, index) => {
            const stepClickable = Boolean(nextAction.onClick && step.label === nextAction.stepLabel && !nextAction.disabled);
            return (
              <div
                className={`demoStep demoStep-${step.status}${stepClickable ? ' demoStep-clickable' : ''}`}
                key={step.label}
                onClick={stepClickable ? nextAction.onClick : undefined}
                onKeyDown={(event) => {
                  if (stepClickable && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    nextAction.onClick();
                  }
                }}
                role={stepClickable ? 'button' : undefined}
                tabIndex={stepClickable ? 0 : undefined}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="consoleGrid">
        <Panel title="Prediction input" icon={<BarChart3 />}>
          <Field label="Mid price" value={form.midPrice} onChange={(value) => updateField('midPrice', value)} suffix="DBUSDC" />
          <Field label="Maker ask price" value={form.orderPrice} onChange={(value) => updateField('orderPrice', value)} suffix="DBUSDC" />
          <Field label="Order size" value={form.quantity} onChange={(value) => updateField('quantity', value)} suffix="SUI" />
          <Field label="Base inventory" value={form.inventoryBase} onChange={(value) => updateField('inventoryBase', value)} suffix="SUI" />
          <Field label="Quote inventory" value={form.inventoryQuote} onChange={(value) => updateField('inventoryQuote', value)} suffix="DBUSDC" />
          <button
            type="button"
            className="secondary"
            disabled={marketBusy || !hasWallet || !onTestnet}
            onClick={fetchMarketPrice}
          >
            {marketBusy ? 'Fetching DeepBook market...' : 'Fetch live DeepBook price'}
          </button>
          {marketQuote ? (
            <small className="marketHint">
              Live {projectConfig.deepBookPoolKey}: mid {fmt(marketQuote.midPrice)} · bid {fmt(marketQuote.bestBid)} · ask{' '}
              {fmt(marketQuote.bestAsk)} DBUSDC
            </small>
          ) : (
            <small className="marketHint">
              Connect on testnet, then pull the real SUI/DBUSDC mid and best ask from DeepBook.
            </small>
          )}
        </Panel>

        <Panel title="LP guardrails" icon={<ShieldCheck />}>
          <Field label="Max notional" value={form.maxNotional} onChange={(value) => updateField('maxNotional', value)} suffix="DBUSDC" />
          <Field label="Min spread" value={form.minSpreadBps} onChange={(value) => updateField('minSpreadBps', value)} suffix="bps" />
          <Field label="Max band distance" value={form.maxBandDistanceBps} onChange={(value) => updateField('maxBandDistanceBps', value)} suffix="bps" />
          <Field label="Max base exposure" value={form.maxInventorySkewBps} onChange={(value) => updateField('maxInventorySkewBps', value)} suffix="bps" />
          <label className="toggle">
            <input type="checkbox" checked={form.active} onChange={(event) => updateField('active', event.target.checked)} />
            Guard policy active
          </label>
        </Panel>

        <Panel title="Risk checks" icon={<Activity />}>
          {Object.entries(risk.checks).map(([key, check]) => (
            <div className={`check check-${check.status.toLowerCase()}`} key={key}>
              <span>{check.label}</span>
              <strong>{check.status}</strong>
              <small>{check.detail}</small>
            </div>
          ))}
        </Panel>

        <Panel title="Wallet execution" icon={<WalletCards />}>
          <Status label="Wallet" value={account?.address || 'Not connected'} />
          <Status label="Sui network" value={hasWallet ? (onTestnet ? 'Ready' : 'Switch required') : 'Not connected'} />
          <Status label="Guard package" value={projectConfig.guardPackageId || 'Publish Move package first'} />
          <input
            className="objectInput"
            value={policyId}
            onChange={(event) => setPolicyId(event.target.value)}
            placeholder="GuardPolicy object id"
            aria-label="GuardPolicy object id"
          />
          <input
            className="objectInput"
            value={balanceManagerId}
            onChange={(event) => setBalanceManagerId(event.target.value)}
            placeholder="BalanceManager object id"
            aria-label="BalanceManager object id"
          />
          <div className="actionStack">
            <ActionButton disabled={Boolean(actionLocks.createPolicy)} reason={actionLocks.createPolicy} onClick={createPolicy}>
              Create guard policy
            </ActionButton>
            <ActionButton
              disabled={Boolean(actionLocks.createBalanceManager)}
              reason={actionLocks.createBalanceManager}
              onClick={createBalanceManager}
            >
              Create BalanceManager
            </ActionButton>
            <ActionButton disabled={Boolean(actionLocks.depositSui)} reason={actionLocks.depositSui} onClick={depositSui}>
              Deposit SUI
            </ActionButton>
            <ActionButton disabled={Boolean(actionLocks.placeOrder)} reason={actionLocks.placeOrder} onClick={placeOrder}>
              Place guarded ask
            </ActionButton>
          </div>
          <div className="cancelRow">
            <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Protocol order id" />
            <button type="button" disabled={Boolean(actionLocks.cancelOrder)} onClick={cancelOrder}>
              Cancel
            </button>
          </div>
          {actionLocks.cancelOrder ? <p className="buttonHint">{actionLocks.cancelOrder}</p> : null}
          <ActionButton disabled={Boolean(actionLocks.withdrawSui)} reason={actionLocks.withdrawSui} onClick={withdrawSui}>
            Withdraw unused SUI
          </ActionButton>
          <button className="secondary" type="button" disabled={Boolean(actionLocks.refreshOrders)} onClick={refreshOrders}>
            Refresh open orders
          </button>
          {actionLocks.refreshOrders ? <p className="buttonHint">{actionLocks.refreshOrders}</p> : null}
        </Panel>
      </section>

      <section className="receipt">
        <ProofLinks links={proofLinks} />
        <div>
          <span>Last digest</span>
          <strong>{digest || 'Waiting for signed transaction'}</strong>
        </div>
        <ol>
          {log.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Panel({ title, icon, children }) {
  return (
    <section className="panel">
      <header>
        {icon}
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, suffix }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div>
        <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
        <em>{suffix}</em>
      </div>
    </label>
  );
}

function Status({ label, value }) {
  return (
    <div className="status">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveMakerAsk(quote, minSpreadBps) {
  const mid = quote?.midPrice;
  if (mid == null || mid <= 0) {
    return quote?.bestAsk != null && quote.bestAsk > 0 ? quote.bestAsk : null;
  }
  const targetSpreadBps = Math.max((minSpreadBps || 0) * 2, 100);
  const targetAsk = mid * (1 + targetSpreadBps / 10_000);
  if (quote?.bestAsk != null && quote.bestAsk >= targetAsk) {
    return quote.bestAsk;
  }
  return targetAsk;
}

function formatPrice(value) {
  if (value == null || !Number.isFinite(value)) return '';
  return String(Number(value.toFixed(4)));
}

function fmt(value) {
  return value == null || !Number.isFinite(value) ? 'n/a' : String(Number(value.toFixed(4)));
}

function ActionButton({ children, disabled, reason, onClick }) {
  return (
    <div className="actionButton">
      <button type="button" disabled={disabled} onClick={onClick}>
        {children}
      </button>
      <small>{reason || 'Ready'}</small>
    </div>
  );
}

function getDecisionView({ risk, phase }) {
  if (phase === 'complete') {
    return {
      statusClass: 'pass',
      icon: <CheckCircle2 />,
      eyebrow: 'Lifecycle complete',
      word: 'DONE',
      summary: 'Order placed, cancelled, and unused SUI recovered on-chain.',
      grade: null,
      dim: false,
    };
  }
  if (phase === 'executed') {
    return {
      statusClass: risk.status.toLowerCase(),
      icon: <Activity />,
      eyebrow: 'Order live on DeepBook',
      word: 'LIVE',
      summary: 'Guarded maker ask is live with an on-chain guard receipt. Cancel is one click away.',
      grade: risk.status,
      dim: false,
    };
  }
  return {
    statusClass: risk.status.toLowerCase(),
    icon: risk.status === 'PASS' ? <CheckCircle2 /> : risk.status === 'WARN' ? <AlertTriangle /> : <XCircle />,
    eyebrow: 'Pre-flight forecast',
    word: risk.blocked ? 'BLOCKED' : 'PENDING',
    summary: risk.blocked
      ? `Prediction only — ${risk.summary}`
      : `Prediction only, no order placed yet — ${risk.summary}`,
    grade: risk.status,
    dim: !risk.blocked,
  };
}

function RiskDecisionBadge({ risk, phase }) {
  const view = getDecisionView({ risk, phase });
  return (
    <div className={`decision decision-${view.statusClass}${view.dim ? ' decision-dim' : ''}`}>
      {view.icon}
      <span>{view.eyebrow}</span>
      <strong>{view.word}</strong>
      {view.grade ? <em className={`decision-grade decision-grade-${view.statusClass}`}>Risk score: {view.grade}</em> : null}
      <small>{view.summary}</small>
    </div>
  );
}

function ProofLinks({ links }) {
  return (
    <div className="proofLinks">
      <span>Proof links</span>
      {links.length ? (
        <div className="proofLinkGrid">
          {links.map((link) => (
            <a key={link.key} href={link.href} target="_blank" rel="noreferrer">
              <strong>{link.label}</strong>
              <small>{link.description}</small>
              <ExternalLink aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : (
        <p>Links appear as soon as wallet-signed testnet transactions and DeepBook objects are available.</p>
      )}
    </div>
  );
}

function getActionLocks({
  busy,
  hasWallet,
  onTestnet,
  hasGuardPackage,
  hasPolicy,
  hasManager,
  liveOrderReady,
  orderId,
  cancelDone,
}) {
  const walletLock = getWalletLock({ busy, hasWallet, onTestnet });
  return {
    createPolicy: walletLock || (!hasGuardPackage ? 'Missing guard package id in .env.' : ''),
    createBalanceManager: walletLock,
    depositSui: walletLock || (!hasManager ? 'Create or paste a BalanceManager id first.' : ''),
    placeOrder:
      walletLock ||
      (!hasGuardPackage ? 'Missing guard package id in .env.' : '') ||
      (!hasPolicy ? 'Create or paste a GuardPolicy id first.' : '') ||
      (!hasManager ? 'Create or paste a BalanceManager id first.' : '') ||
      (!liveOrderReady ? 'Risk checks must not be BLOCK.' : ''),
    refreshOrders:
      (busy ? 'Waiting for wallet transaction.' : '') ||
      (!hasWallet ? 'Connect wallet first.' : '') ||
      (!hasManager ? 'Create or paste a BalanceManager id first.' : ''),
    cancelOrder:
      walletLock ||
      (!hasPolicy ? 'Create or paste a GuardPolicy id first.' : '') ||
      (!orderId ? 'Refresh or paste a protocol order id first.' : ''),
    withdrawSui:
      walletLock ||
      (!hasManager ? 'Create or paste a BalanceManager id first.' : '') ||
      (!cancelDone ? 'Cancel the order before withdrawing unused SUI.' : ''),
  };
}

function getWalletLock({ busy, hasWallet, onTestnet }) {
  if (busy) return 'Waiting for wallet transaction.';
  if (!hasWallet) return 'Connect Sui wallet first.';
  if (!onTestnet) return 'Switch wallet to the configured Sui network.';
  return '';
}

function getDemoSteps({
  hasWallet,
  onTestnet,
  hasGuardPackage,
  hasPolicy,
  hasManager,
  depositDone,
  orderPlaced,
  orderId,
  cancelDone,
  withdrawDone,
  risk,
}) {
  const walletReady = hasWallet && onTestnet;
  return [
    {
      label: 'Wallet',
      status: walletReady ? 'done' : 'next',
      detail: walletReady ? 'Wallet connected' : hasWallet ? 'Switch to configured network' : 'Connect Sui wallet',
    },
    {
      label: 'Guard package',
      status: hasGuardPackage ? 'done' : walletReady ? 'next' : 'waiting',
      detail: hasGuardPackage ? 'Move package configured' : 'Set VITE_GUARD_PACKAGE_ID',
    },
    {
      label: 'Policy',
      status: hasPolicy ? 'done' : walletReady && hasGuardPackage ? 'next' : 'waiting',
      detail: hasPolicy ? 'GuardPolicy object ready' : 'Create shared risk policy',
    },
    {
      label: 'Manager',
      status: hasManager ? 'done' : hasPolicy ? 'next' : 'waiting',
      detail: hasManager ? 'Trading manager selected' : 'Create DeepBook manager',
    },
    {
      label: 'Deposit',
      status: depositDone ? 'done' : hasManager ? 'next' : 'waiting',
      detail: depositDone ? 'SUI funded' : 'Fund the manager',
    },
    {
      label: 'Guarded ask',
      status: orderPlaced || orderId ? 'done' : depositDone && !risk.blocked ? 'next' : 'waiting',
      detail: orderPlaced || orderId ? 'Order action recorded' : risk.blocked ? 'Fix BLOCK checks first' : 'Place maker ask',
    },
    {
      label: 'Cancel',
      status: cancelDone ? 'done' : orderId ? 'next' : 'waiting',
      detail: cancelDone ? 'Cancel receipt recorded' : 'Cancel immediately after order id appears',
    },
    {
      label: 'Withdraw',
      status: withdrawDone ? 'done' : cancelDone ? 'next' : 'waiting',
      detail: withdrawDone ? 'Unused SUI returned' : 'Recover unused SUI to wallet',
    },
  ];
}

function getNextAction({
  hasWallet,
  onTestnet,
  hasGuardPackage,
  hasPolicy,
  hasManager,
  depositDone,
  orderPlaced,
  orderId,
  cancelDone,
  withdrawDone,
  risk,
  busy,
  actions,
}) {
  if (!hasWallet) {
    return {
      title: 'Connect a Sui wallet',
      detail: 'Use the wallet button in the top right. The app never asks for a browser private key.',
      buttonLabel: 'Use top-right Connect button',
    };
  }
  if (!onTestnet) {
    return {
      title: 'Switch wallet network',
      detail: 'This deployment is pinned to a configured Sui environment. Change the network inside your wallet.',
      buttonLabel: 'Switch network in wallet',
    };
  }
  if (!hasGuardPackage) {
    return {
      title: 'Set guard package id',
      detail: 'Publish the Move package, then set VITE_GUARD_PACKAGE_ID in .env before using live buttons.',
      buttonLabel: 'Missing .env value',
    };
  }
  if (risk.blocked) {
    return {
      title: 'Fix BLOCK risk checks',
      detail: 'Adjust the prediction input or LP guardrails until the decision is PASS or WARN, then continue execution.',
      buttonLabel: 'Risk is blocked',
    };
  }
  if (!hasPolicy) {
    return {
      stepLabel: 'Policy',
      title: 'Create the GuardPolicy',
      detail: 'This writes your current guardrails into a shared on-chain policy object used by later receipt calls.',
      buttonLabel: 'Create guard policy',
      onClick: actions.createPolicy,
      disabled: busy,
    };
  }
  if (!hasManager) {
    return {
      stepLabel: 'Manager',
      title: 'Create a BalanceManager',
      detail: 'DeepBook orders use a BalanceManager. Create one here, or paste an existing manager id on the right.',
      buttonLabel: 'Create BalanceManager',
      onClick: actions.createBalanceManager,
      disabled: busy,
    };
  }
  if (!depositDone) {
    return {
      stepLabel: 'Deposit',
      title: 'Fund the BalanceManager',
      detail: 'Fund the BalanceManager with enough SUI for the SUI/DBUSDC pool minimum order size.',
      buttonLabel: 'Deposit SUI',
      onClick: actions.depositSui,
      disabled: busy,
    };
  }
  if (!orderPlaced && !orderId) {
    return {
      stepLabel: 'Guarded ask',
      title: 'Place the guarded maker ask',
      detail: 'The app builds one transaction that places the DeepBook order and records the guard receipt.',
      buttonLabel: 'Place guarded ask',
      onClick: actions.placeOrder,
      disabled: busy,
    };
  }
  if (orderPlaced && !orderId) {
    return {
      stepLabel: 'Guarded ask',
      title: 'Find the protocol order id',
      detail: 'Refresh open orders. If DeepBook does not return it, paste the order id from the transaction effects.',
      buttonLabel: 'Refresh open orders',
      onClick: actions.refreshOrders,
      disabled: busy,
    };
  }
  if (!cancelDone) {
    return {
      stepLabel: 'Cancel',
      title: 'Cancel the maker ask',
      detail: 'Cancel after the order id appears so the walkthrough shows the full guard lifecycle.',
      buttonLabel: 'Cancel order',
      onClick: actions.cancelOrder,
      disabled: busy,
    };
  }
  if (!withdrawDone) {
    return {
      stepLabel: 'Withdraw',
      title: 'Withdraw unused SUI',
      detail: 'Cancel releases the order funds back into the BalanceManager. Withdraw now returns the unused SUI to the connected wallet.',
      buttonLabel: 'Withdraw unused SUI',
      onClick: actions.withdrawSui,
      disabled: busy,
    };
  }
  return {
    title: 'Execution flow complete',
    detail: 'The wallet signed policy creation, manager funding, guarded order placement, cancel receipt, and fund recovery transactions.',
    buttonLabel: 'Ready to record the summary',
  };
}

createRoot(document.getElementById('root')).render(<App />);
