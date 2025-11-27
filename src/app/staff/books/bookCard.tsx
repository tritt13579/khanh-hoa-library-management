import React from "react";
import Link from "next/link";

interface BookCardProps {
  title: string;
  author: string;
  image: string;
  category: string;
}

const BookCard: React.FC<BookCardProps> = ({
  title,
  author,
  image,
  category,
}) => {
  return (
    <Link href="#" passHref>
      <div className="flex flex-col rounded-2xl overflow-hidden shadow hover:shadow-lg transition duration-300 bg-white">
        <div className="relative w-full h-64 overflow-hidden">
          <img
            src={image || "/default-cover.jpg"}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
        <div className="flex flex-col gap-1 p-4 flex-1">
          <p className="text-xs text-gray-500 italic">{category}</p>
          <h3 className="text-base font-semibold text-gray-800 line-clamp-2">{title}</h3>
          <p className="text-sm text-gray-600 line-clamp-1">{author}</p>
        </div>
      </div>
    </Link>
  );
};

export default BookCard;
