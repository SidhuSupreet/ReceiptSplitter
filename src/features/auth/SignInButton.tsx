import { GoogleLogin } from '@react-oauth/google'

import { useToast } from '@/shared/components/ui/toaster'

import { useAuth } from './AuthProvider'

type SignInButtonProps = {
  /** Visual size passed through to the GIS button. */
  size?: 'small' | 'medium' | 'large'
  /** GIS shape — pill matches the header better; rectangular is the default. */
  shape?: 'rectangular' | 'pill'
  text?: 'signin' | 'signin_with' | 'continue_with'
}

/**
 * Renders the Google-issued sign-in button. The credential returned by GIS
 * goes straight to AuthProvider — we never expose it back to the caller.
 */
export function SignInButton({
  size = 'medium',
  shape = 'pill',
  text = 'signin_with',
}: SignInButtonProps) {
  const { setCredential, configured } = useAuth()
  const { toast } = useToast()

  if (!configured) {
    return (
      <span className="text-xs text-(--color-muted-foreground)">
        Sign-in not configured
      </span>
    )
  }

  return (
    <GoogleLogin
      size={size}
      shape={shape}
      text={text}
      onSuccess={(response) => {
        if (!response.credential) {
          toast({
            title: 'Sign-in failed',
            description: 'Google did not return a credential.',
            variant: 'destructive',
          })
          return
        }
        setCredential(response.credential)
      }}
      onError={() => {
        toast({
          title: 'Sign-in failed',
          description: 'Try again, or use manual entry instead.',
          variant: 'destructive',
        })
      }}
    />
  )
}
