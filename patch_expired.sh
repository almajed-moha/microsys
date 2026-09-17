sed -i 's/if (isQuotaExpired || isTimeExpired) {/if (isQuotaExpired || isTimeExpired || u.disabled) {/g' src/components/MikrotikExpiredCardsModal.tsx
