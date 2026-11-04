// Wallet: your share of every accepted job, and a demo withdrawal to eSewa, Khalti or a bank.
import { useState } from 'react';
import { View } from 'react-native';

import { useWallet, useWithdraw } from '@/api/hooks';
import { Field, useErrorText } from '@/components/forms';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button, Chip, HelpLine, Panel, Section, Stats } from '@/components/ui';
import { useT } from '@/i18n';
import { money } from '@/lib/format';
import { colors, space } from '@/theme';

const METHODS = ['esewa', 'khalti', 'bank'] as const;

export default function WalletScreen() {
  const { t } = useT();
  const w = useWallet().data;
  const withdraw = useWithdraw();
  const errorText = useErrorText();
  const [method, setMethod] = useState<(typeof METHODS)[number]>('esewa');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [sent, setSent] = useState('');
  const b = w?.balances.find((x) => x.currency === 'USD') ?? w?.balances[0];
  const cur = b?.currency ?? 'USD';
  const minor = Math.round(Number(amount || (b ? b.available_minor / 100 : 0)) * 100);
  return (
    <Screen back title={t('wallet.title')}>
      <Stats items={[
        { value: money(b?.available_minor ?? 0, cur), label: t('wallet.available'), tone: 'pine' },
        { value: money(b?.held_minor ?? 0, cur), label: t('wallet.held') },
        { value: money(b?.withdrawn_minor ?? 0, cur), label: t('wallet.withdrawn') },
      ]} />
      <HelpLine text={t('wallet.help')} />

      <Section title={t('wallet.withdrawTitle')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {METHODS.map((m) => <Chip key={m} label={t(`wallet.m_${m}`)} on={method === m} onToggle={() => setMethod(m)} />)}
        </View>
        <Field label={t(method === 'bank' ? 'wallet.bankAccount' : 'wallet.phone')} value={account} onChangeText={setAccount}
          placeholder={method === 'bank' ? '0123 4567 8901' : '98XXXXXXXX'} keyboardType="number-pad" />
        <Field label={t('wallet.amount', { currency: cur })} value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
          placeholder={b ? String(b.available_minor / 100) : '0'} />
        <Button label={t('wallet.send', { amount: money(minor > 0 ? minor : 0, cur), method: t(`wallet.m_${method}`) })}
          disabled={!b || b.available_minor <= 0 || account.trim().length < 3 || minor <= 0} busy={withdraw.isPending}
          onPress={() => withdraw.mutate({ amount_minor: minor, currency: cur, method, account }, {
            onSuccess: () => { setSent(t('wallet.sent', { amount: money(minor, cur), method: t(`wallet.m_${method}`) })); setAmount(''); },
          })} />
        {sent ? <Panel tone="honey"><Txt>{sent}</Txt></Panel> : null}
        {withdraw.error ? <Txt color={colors.brick}>{errorText(withdraw.error, { not_enough_money: t('wallet.notEnough') })}</Txt> : null}
      </Section>

      {w?.withdrawals.length ? (
        <Section title={t('wallet.history')}>
          {w.withdrawals.map((x) => (
            <Panel key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{money(x.amount_minor, x.currency)}</Txt>
                <Txt variant="small" color={colors.inkSoft}>
                  {t(`wallet.m_${x.method}`)} · {x.account} · {new Date(x.created_at).toLocaleDateString()}
                </Txt>
              </View>
              <Txt variant="label" color={colors.pine}>{t('wallet.statusSent')}</Txt>
            </Panel>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
