import { Helmet } from "react-helmet-async";

type PageMetaProps = {
    title?: string;
    description?: string;
    favicon?: string;
};

export default function PageMeta({
    title,
    description,
    favicon,
}: PageMetaProps) {
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
