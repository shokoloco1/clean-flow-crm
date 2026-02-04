-- Fix: Remove automatic role assignment for new users
--
-- PROBLEM: The handle_new_user trigger was assigning 'staff' role to ALL new users,
-- which broke the multi-step signup flow (Account → Plan → Payment).
-- Users were immediately redirected to dashboard because they had a role.
--
-- SOLUTION: Only assign role for invited staff members (intended_role = 'staff').
-- Regular admin signups get their role assigned AFTER completing payment
-- via the Stripe webhook or bootstrap-role function.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _intended_role text;
BEGIN
  -- Create profile (always needed for all users)
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );

  -- Check intended role from user metadata
  _intended_role := NEW.raw_user_meta_data ->> 'intended_role';

  -- ONLY create role for invited staff members
  -- They use ?invited=true and skip the payment flow
  IF _intended_role = 'staff' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff'::app_role);
  END IF;

  -- For regular signups (owners/admins):
  -- NO role is assigned here. The role will be assigned when:
  -- 1. First user bootstraps via bootstrap-role edge function, OR
  -- 2. User completes Stripe checkout (webhook assigns admin role)
  -- This allows the multi-step signup flow to work correctly.

  RETURN NEW;
END;
$$;

-- Add comment explaining the logic
COMMENT ON FUNCTION public.handle_new_user() IS
'Creates profile for new users. Only assigns staff role for invited members.
Admin role is assigned later via bootstrap-role or Stripe webhook after payment.';
