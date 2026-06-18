import { Helmet } from "react-helmet-async";

export default function PageMeta({
    title,
    description,
    favicon,
}) {
    return (
        <Helmet>
            {title && <title>{title}</title>}

            {description && (
                <meta
                    name="description"
                    content={description}
                />
            )}

            {favicon && (
                <link
                    rel="icon"
                    href={favicon}
                />
            )}
        </Helmet>
    );
}