import VoucherManager from '../../components/VoucherManager'

export default function Vouchers() {
  return <VoucherManager endpoint="/admin/vouchers" title="Voucher Platform" allowFreeShipping />
}
