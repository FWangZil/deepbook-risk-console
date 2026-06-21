module deepbook_risk_console::deepbook_risk_console {
    use sui::event;
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    const EInactive: u64 = 0;
    const ENotOwner: u64 = 1;
    const ENotionalExceeded: u64 = 2;
    const ESpreadTooLow: u64 = 3;
    const ESkewExceeded: u64 = 4;
    const EOrderSizeExceeded: u64 = 5;

    public struct GuardPolicy has key, store {
        id: UID,
        owner: address,
        pool_key: vector<u8>,
        max_notional_microusd: u64,
        min_spread_bps: u64,
        max_inventory_skew_bps: u64,
        max_order_size_microunits: u64,
        active: bool,
    }

    public struct GuardReceipt has key, store {
        id: UID,
        policy_id: ID,
        actor: address,
        side: vector<u8>,
        price_microusd: u64,
        quantity_microunits: u64,
        client_order_id: vector<u8>,
        protocol_order_id: vector<u8>,
        risk_score_bps: u64,
        deepbook_action: vector<u8>,
    }

    public struct GuardActionRecorded has copy, drop {
        policy_id: ID,
        actor: address,
        risk_score_bps: u64,
    }

    entry fun create_policy(
        pool_key: vector<u8>,
        max_notional_microusd: u64,
        min_spread_bps: u64,
        max_inventory_skew_bps: u64,
        max_order_size_microunits: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let policy = GuardPolicy {
            id: object::new(ctx),
            owner: sender,
            pool_key,
            max_notional_microusd,
            min_spread_bps,
            max_inventory_skew_bps,
            max_order_size_microunits,
            active: true,
        };
        transfer::share_object(policy);
    }

    entry fun update_policy(
        policy: &mut GuardPolicy,
        max_notional_microusd: u64,
        min_spread_bps: u64,
        max_inventory_skew_bps: u64,
        max_order_size_microunits: u64,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(policy.owner == sender, ENotOwner);
        policy.max_notional_microusd = max_notional_microusd;
        policy.min_spread_bps = min_spread_bps;
        policy.max_inventory_skew_bps = max_inventory_skew_bps;
        policy.max_order_size_microunits = max_order_size_microunits;
    }

    entry fun deactivate_policy(policy: &mut GuardPolicy, ctx: &TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(policy.owner == sender, ENotOwner);
        policy.active = false;
    }

    entry fun record_guarded_order(
        policy: &GuardPolicy,
        side: vector<u8>,
        price_microusd: u64,
        quantity_microunits: u64,
        notional_microusd: u64,
        spread_bps: u64,
        inventory_skew_bps: u64,
        client_order_id: vector<u8>,
        risk_score_bps: u64,
        deepbook_action: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert_guard(policy, notional_microusd, spread_bps, inventory_skew_bps, quantity_microunits, ctx);
        mint_receipt(
            policy,
            side,
            price_microusd,
            quantity_microunits,
            client_order_id,
            vector[],
            risk_score_bps,
            deepbook_action,
            ctx,
        );
    }

    entry fun record_cancel(
        policy: &GuardPolicy,
        side: vector<u8>,
        price_microusd: u64,
        quantity_microunits: u64,
        client_order_id: vector<u8>,
        protocol_order_id: vector<u8>,
        risk_score_bps: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(policy.active, EInactive);
        assert!(policy.owner == sender, ENotOwner);
        mint_receipt(
            policy,
            side,
            price_microusd,
            quantity_microunits,
            client_order_id,
            protocol_order_id,
            risk_score_bps,
            b"cancel_order",
            ctx,
        );
    }

    fun assert_guard(
        policy: &GuardPolicy,
        notional_microusd: u64,
        spread_bps: u64,
        inventory_skew_bps: u64,
        quantity_microunits: u64,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(policy.active, EInactive);
        assert!(policy.owner == sender, ENotOwner);
        assert!(notional_microusd <= policy.max_notional_microusd, ENotionalExceeded);
        assert!(spread_bps >= policy.min_spread_bps, ESpreadTooLow);
        assert!(inventory_skew_bps <= policy.max_inventory_skew_bps, ESkewExceeded);
        assert!(quantity_microunits <= policy.max_order_size_microunits, EOrderSizeExceeded);
    }

    fun mint_receipt(
        policy: &GuardPolicy,
        side: vector<u8>,
        price_microusd: u64,
        quantity_microunits: u64,
        client_order_id: vector<u8>,
        protocol_order_id: vector<u8>,
        risk_score_bps: u64,
        deepbook_action: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let policy_id = object::uid_to_inner(&policy.id);
        let receipt = GuardReceipt {
            id: object::new(ctx),
            policy_id,
            actor: sender,
            side,
            price_microusd,
            quantity_microunits,
            client_order_id,
            protocol_order_id,
            risk_score_bps,
            deepbook_action,
        };
        event::emit(GuardActionRecorded { policy_id, actor: sender, risk_score_bps });
        transfer::transfer(receipt, policy.owner);
    }

    public fun owner(policy: &GuardPolicy): address {
        policy.owner
    }

    public fun active(policy: &GuardPolicy): bool {
        policy.active
    }
}
