DO $$
DECLARE
  v_user_id UUID := 'c5a78089-d46b-4d71-89ad-1c7523b1ae98';
  v_email TEXT := 'titouan@tacl-group.com';
  v_full_name TEXT := 'titouan';
  v_workspace_id UUID;
BEGIN
  -- Skip if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE NOTICE 'Profile already exists, skipping';
    RETURN;
  END IF;

  INSERT INTO public.workspaces (name, created_by)
    VALUES (v_full_name || '''s workspace', v_user_id)
    RETURNING id INTO v_workspace_id;

  INSERT INTO public.profiles (id, workspace_id, full_name, email)
    VALUES (v_user_id, v_workspace_id, v_full_name, v_email);

  INSERT INTO public.user_roles (user_id, workspace_id, role)
    VALUES (v_user_id, v_workspace_id, 'manager');
END $$;