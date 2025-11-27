import { FormattedReservation } from "@/interfaces/library";

interface ReservationsTabProps {
  reservations: FormattedReservation[];
}

const ReservationsTab: React.FC<ReservationsTabProps> = ({ reservations }) => {
  return <div>Đặt trước sách</div>;
};
export default ReservationsTab;
