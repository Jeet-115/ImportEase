import { motion } from "framer-motion";

const PageHeader = ({ eyebrow, title, description, action }) => (
  <motion.header
    className="ie-card mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="space-y-2 min-w-0">
      {eyebrow ? <p className="ie-eyebrow">{eyebrow}</p> : null}
      <h1 className="ie-page-title">{title}</h1>
      {description ? <p className="ie-page-desc">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </motion.header>
);

export default PageHeader;
