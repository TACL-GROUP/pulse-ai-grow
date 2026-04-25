-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('manager', 'user');
CREATE TYPE public.completion_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.redemption_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired');

-- ============= WORKSPACES =============
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  department TEXT,
  coins_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_workspace ON public.profiles(workspace_id);

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ============= SECURITY DEFINER FUNCTIONS =============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_workspace(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_manager(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = 'manager'
  )
$$;

-- ============= INVITATIONS =============
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);

-- ============= TASKS =============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  department TEXT NOT NULL DEFAULT 'All',
  coin_value INTEGER NOT NULL DEFAULT 10 CHECK (coin_value >= 0),
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);

-- ============= TASK COMPLETIONS =============
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  note TEXT,
  status public.completion_status NOT NULL DEFAULT 'pending',
  coins_awarded INTEGER NOT NULL DEFAULT 0,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_completions_workspace ON public.task_completions(workspace_id);
CREATE INDEX idx_completions_user ON public.task_completions(user_id);

-- ============= REWARDS =============
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🎁',
  coin_cost INTEGER NOT NULL CHECK (coin_cost > 0),
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rewards_workspace ON public.rewards(workspace_id);

-- ============= REWARD REDEMPTIONS =============
CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  coin_cost INTEGER NOT NULL,
  status public.redemption_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_redemptions_workspace ON public.reward_redemptions(workspace_id);

-- ============= RLS POLICIES =============

-- Workspaces
CREATE POLICY "Members can view their workspace" ON public.workspaces
  FOR SELECT TO authenticated
  USING (id = public.get_user_workspace(auth.uid()));

-- Profiles
CREATE POLICY "Users can view profiles in their workspace" ON public.profiles
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- User roles
CREATE POLICY "Users can view roles in their workspace" ON public.user_roles
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace(auth.uid()));

CREATE POLICY "Managers can manage roles in their workspace" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_manager(auth.uid(), workspace_id));

-- Invitations
CREATE POLICY "Managers can view invitations in their workspace" ON public.invitations
  FOR SELECT TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id));

CREATE POLICY "Managers can create invitations" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_manager(auth.uid(), workspace_id));

CREATE POLICY "Managers can update/delete invitations" ON public.invitations
  FOR DELETE TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id));

-- Tasks
CREATE POLICY "Members can view tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace(auth.uid()));

CREATE POLICY "Managers can manage tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_manager(auth.uid(), workspace_id));

-- Task completions
CREATE POLICY "Members can view completions in their workspace" ON public.task_completions
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace(auth.uid()));

CREATE POLICY "Users can create their own completions" ON public.task_completions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id = public.get_user_workspace(auth.uid()));

CREATE POLICY "Managers can update completions" ON public.task_completions
  FOR UPDATE TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id));

-- Rewards
CREATE POLICY "Members can view rewards" ON public.rewards
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace(auth.uid()));

CREATE POLICY "Managers can manage rewards" ON public.rewards
  FOR ALL TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_manager(auth.uid(), workspace_id));

-- Reward redemptions
CREATE POLICY "Members can view redemptions in workspace" ON public.reward_redemptions
  FOR SELECT TO authenticated
  USING (workspace_id = public.get_user_workspace(auth.uid()));

CREATE POLICY "Users can create their own redemptions" ON public.reward_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id = public.get_user_workspace(auth.uid()));

CREATE POLICY "Managers can update redemptions" ON public.reward_redemptions
  FOR UPDATE TO authenticated
  USING (public.is_workspace_manager(auth.uid(), workspace_id));

-- ============= UPDATED_AT TRIGGER =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rewards_updated BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= HANDLE NEW USER =============
-- On signup: if invitation_token in metadata, attach to that workspace as 'user'
-- otherwise create new workspace and make them manager
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invitation_token TEXT;
  v_invitation public.invitations%ROWTYPE;
  v_workspace_id UUID;
  v_full_name TEXT;
  v_workspace_name TEXT;
BEGIN
  v_invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_workspace_name := COALESCE(NEW.raw_user_meta_data->>'workspace_name', v_full_name || '''s workspace');

  IF v_invitation_token IS NOT NULL THEN
    SELECT * INTO v_invitation FROM public.invitations
      WHERE token = v_invitation_token
        AND status = 'pending'
        AND expires_at > now()
        AND lower(email) = lower(NEW.email)
      LIMIT 1;

    IF v_invitation.id IS NOT NULL THEN
      v_workspace_id := v_invitation.workspace_id;

      INSERT INTO public.profiles (id, workspace_id, full_name, email, department)
        VALUES (NEW.id, v_workspace_id, v_full_name, NEW.email, NEW.raw_user_meta_data->>'department');

      INSERT INTO public.user_roles (user_id, workspace_id, role)
        VALUES (NEW.id, v_workspace_id, 'user');

      UPDATE public.invitations SET status = 'accepted' WHERE id = v_invitation.id;
      RETURN NEW;
    END IF;
  END IF;

  -- Default: create new workspace, become manager
  INSERT INTO public.workspaces (name, created_by)
    VALUES (v_workspace_name, NEW.id)
    RETURNING id INTO v_workspace_id;

  INSERT INTO public.profiles (id, workspace_id, full_name, email, department)
    VALUES (NEW.id, v_workspace_id, v_full_name, NEW.email, NEW.raw_user_meta_data->>'department');

  INSERT INTO public.user_roles (user_id, workspace_id, role)
    VALUES (NEW.id, v_workspace_id, 'manager');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= APPROVE COMPLETION (atomic + credit coins) =============
CREATE OR REPLACE FUNCTION public.approve_completion(_completion_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_completion public.task_completions%ROWTYPE;
  v_coin_value INTEGER;
BEGIN
  SELECT * INTO v_completion FROM public.task_completions WHERE id = _completion_id;
  IF v_completion.id IS NULL THEN RAISE EXCEPTION 'Completion not found'; END IF;
  IF NOT public.is_workspace_manager(auth.uid(), v_completion.workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_completion.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  SELECT coin_value INTO v_coin_value FROM public.tasks WHERE id = v_completion.task_id;

  UPDATE public.task_completions
    SET status = 'approved',
        coins_awarded = v_coin_value,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = _completion_id;

  UPDATE public.profiles
    SET coins_balance = coins_balance + v_coin_value
    WHERE id = v_completion.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_completion(_completion_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_completion public.task_completions%ROWTYPE;
BEGIN
  SELECT * INTO v_completion FROM public.task_completions WHERE id = _completion_id;
  IF v_completion.id IS NULL THEN RAISE EXCEPTION 'Completion not found'; END IF;
  IF NOT public.is_workspace_manager(auth.uid(), v_completion.workspace_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_completion.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  UPDATE public.task_completions
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _completion_id;
END;
$$;

-- ============= REDEEM REWARD (atomic) =============
CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reward public.rewards%ROWTYPE;
  v_balance INTEGER;
  v_redemption_id UUID;
BEGIN
  SELECT * INTO v_reward FROM public.rewards WHERE id = _reward_id AND is_active = true;
  IF v_reward.id IS NULL THEN RAISE EXCEPTION 'Reward not available'; END IF;
  IF v_reward.workspace_id <> public.get_user_workspace(auth.uid()) THEN
    RAISE EXCEPTION 'Wrong workspace';
  END IF;

  SELECT coins_balance INTO v_balance FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF v_balance < v_reward.coin_cost THEN RAISE EXCEPTION 'Insufficient coins'; END IF;

  UPDATE public.profiles SET coins_balance = coins_balance - v_reward.coin_cost WHERE id = auth.uid();

  INSERT INTO public.reward_redemptions (reward_id, user_id, workspace_id, coin_cost)
    VALUES (_reward_id, auth.uid(), v_reward.workspace_id, v_reward.coin_cost)
    RETURNING id INTO v_redemption_id;

  RETURN v_redemption_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_redemption(_redemption_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_r public.reward_redemptions%ROWTYPE;
BEGIN
  SELECT * INTO v_r FROM public.reward_redemptions WHERE id = _redemption_id;
  IF v_r.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF NOT public.is_workspace_manager(auth.uid(), v_r.workspace_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_r.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
  UPDATE public.reward_redemptions SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_redemption_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_redemption(_redemption_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_r public.reward_redemptions%ROWTYPE;
BEGIN
  SELECT * INTO v_r FROM public.reward_redemptions WHERE id = _redemption_id;
  IF v_r.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF NOT public.is_workspace_manager(auth.uid(), v_r.workspace_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_r.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
  -- refund
  UPDATE public.profiles SET coins_balance = coins_balance + v_r.coin_cost WHERE id = v_r.user_id;
  UPDATE public.reward_redemptions SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_redemption_id;
END;
$$;