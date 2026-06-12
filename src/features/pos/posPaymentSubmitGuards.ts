export function isPosPaymentSubmitDisabled(input: {
  selectedCheckoutCode: string | null;
  submitting: boolean;
  paymentIsSubmitting: boolean;
  gatewayCheckoutPending: boolean;
  paymentAckRequired: boolean;
}): boolean {
  return (
    !input.selectedCheckoutCode
    || input.submitting
    || input.paymentIsSubmitting
    || input.gatewayCheckoutPending
    || input.paymentAckRequired
  );
}

export function shouldClearCartAfterCheckout(success: boolean): boolean {
  return success;
}
