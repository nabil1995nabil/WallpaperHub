-- Remove legacy plaintext API secrets after the server supports token_hash authentication.
update public.api_tokens
set token = ''
where token_hash is not null
  and token_hash <> ''
  and coalesce(token, '') <> '';
