-- Table d'historique
CREATE TABLE public.coin_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  adjusted_by UUID NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view adjustments in their workspace"
  ON public.coin_adjustments
  FOR SELECT
  TO authenticated
  USING (workspace_id = public.get_user_workspace(auth.uid()));

-- Pas de policy INSERT/UPDATE/DELETE : seul SECURITY DEFINER peut écrire

CREATE INDEX idx_coin_adjustments_user ON public.coin_adjustments(user_id, created_at DESC);
CREATE INDEX idx_coin_adjustments_workspace ON public.coin_adjustments(workspace_id, created_at DESC);

-- RPC sécurisée
CREATE OR REPLACE FUNCTION public.adjust_user_coins(
  _user_id UUID,
  _amount INTEGER,
  _reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF _amount = 0 THEN
    RAISE EXCEPTION 'Amount cannot be zero';
  END IF;

  SELECT workspace_id, coins_balance
    INTO v_workspace_id, v_current_balance
    FROM public.profiles
    WHERE id = _user_id
    FOR UPDATE;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF NOT public.is_workspace_manager(auth.uid(), v_workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_new_balance := v_current_balance + _amount;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Balance cannot go below zero (current: %, requested: %)', v_current_balance, _amount;
  END IF;

  UPDATE public.profiles
    SET coins_balance = v_new_balance
    WHERE id = _user_id;

  INSERT INTO public.coin_adjustments (workspace_id, user_id, adjusted_by, amount, reason)
    VALUES (v_workspace_id, _user_id, auth.uid(), _amount, _reason);

  RETURN v_new_balance;
END;
$$;