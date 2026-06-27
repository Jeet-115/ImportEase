import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const BackButton = ({ label = "Back", fallback = "/" }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="ie-btn-ghost mb-4"
    >
      <FiArrowLeft />
      <span>{label}</span>
    </button>
  );
};

export default BackButton;
