"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { XCircleIcon } from "@heroicons/react/24/solid";
import { useToast } from "@/hooks/use-toast";
import { supabaseClient } from "@/lib/client";

interface BookFormModalProps {
  isOpen: boolean;
  isEdit: boolean;
  book?: any;
  onClose: () => void;
  onSuccess?: () => void;
}

const BookFormModal: React.FC<BookFormModalProps> = ({ isOpen, isEdit, book, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    title: "",
    authors: [] as { id: string; name: string }[],
    publication_year: "",
    isbn: "",
    language: "",
    edition: "",
    category_id: "",
    publisher_id: "",
    shelf_id: "",
    description: "",
    cover_image: "",
  });

  const [shelves, setShelves] = useState<{ shelf_id: string; location: string }[]>([]);
  const [publishers, setPublishers] = useState<{ publisher_id: string; publisher_name: string }[]>([]);
  const [categories, setCategories] = useState<{ category_id: string; category_name: string }[]>([]);
  const [authors, setAuthors] = useState<{ author_id: string; author_name: string }[]>([]);
  const [authorSearch, setAuthorSearch] = useState("");
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      const supabase = supabaseClient();
      const [shelvesRes, publishersRes, categoriesRes, authorsRes] = await Promise.all([
        supabase.from("shelf").select("shelf_id, location"),
        supabase.from("publisher").select("publisher_id, publisher_name"),
        supabase.from("category").select("category_id, category_name"),
        supabase.from("author").select("author_id, author_name"),
      ]);
      if (!shelvesRes.error) setShelves(shelvesRes.data || []);
      if (!publishersRes.error) setPublishers(publishersRes.data || []);
      if (!categoriesRes.error) setCategories(categoriesRes.data || []);
      if (!authorsRes.error) setAuthors(authorsRes.data || []);
    };
    if (isOpen) fetchDropdowns();
  }, [isOpen]);

  useEffect(() => {
    if (isEdit && book) {
      const authors =
        book.iswrittenby
          ?.map((rel: any) => ({
            id: rel.author?.author_id ? String(rel.author.author_id) : "",
            name: rel.author?.author_name || "",
          }))
          .filter((author: { id: string }) => author.id) || [];
      setFormValues({
        title: book.title || "",
        authors,
        publication_year: book.publication_year?.toString() || "",
        isbn: book.isbn || "",
        language: book.language || "",
        edition: book.edition || "",
        category_id: book.category_id || "",
        publisher_id: book.publisher_id || "",
        shelf_id: book.shelf_id || "",
        description: book.description || "",
        cover_image: book.cover_image || "",
      });
    } else {
      setFormValues({
        title: "",
        authors: [],
        publication_year: "",
        isbn: "",
        language: "",
        edition: "",
        category_id: "",
        publisher_id: "",
        shelf_id: "",
        description: "",
        cover_image: "",
      });
      setSelectedImage(null);
    }
  }, [isEdit, book, isOpen]);

  const handleSave = async () => {
    if (
      !formValues.title || !formValues.isbn || !formValues.publication_year ||
      !formValues.language || !formValues.category_id || !formValues.publisher_id || !formValues.shelf_id
    ) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập đầy đủ", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (selectedImage) formData.append("coverImageFile", selectedImage);

      const bookData = {
        ...formValues,
        book_title_id: isEdit ? book.book_title_id : undefined,
        publication_year: parseInt(formValues.publication_year),
      };
      formData.append("bookData", JSON.stringify(bookData));

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/book/save`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Không thể lưu");

      toast({ title: isEdit ? "Cập nhật thành công" : "Thêm sách thành công", variant: "success" });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAuthors = authors.filter(a =>
    a.author_name.toLowerCase().includes(authorSearch.toLowerCase())
  );

  const addAuthor = (author: { author_id: string; author_name: string }) => {
    const authorId = String(author.author_id);
    const exists = formValues.authors.some((a) => a.id === authorId);
    if (!exists) {
      setFormValues(prev => ({
        ...prev,
        authors: [...prev.authors, { id: authorId, name: author.author_name }],
      }));
    }
    setAuthorSearch("");
    setShowAuthorDropdown(false);
  };

  const removeAuthor = (id: string) => {
    setFormValues(prev => ({
      ...prev,
      authors: prev.authors.filter(a => a.id !== id),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa sách" : "Thêm sách mới"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Label>Tên sách</Label>
          <Input
            value={formValues.title}
            onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
            placeholder="Tên sách"
          />

          <div>
            <Label>Tác giả</Label>
            <div className="mb-2 flex flex-wrap gap-2">
              {formValues.authors.map((author) => (
                <div key={author.id} className="flex items-center gap-1 rounded bg-muted px-2 py-1">
                  <span>{author.name}</span>
                  <button type="button" onClick={() => removeAuthor(author.id)}>
                    <XCircleIcon className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <Input
              placeholder="Tìm tác giả..."
              value={authorSearch}
              onChange={(e) => {
                setAuthorSearch(e.target.value);
                setShowAuthorDropdown(true);
              }}
              onFocus={() => setShowAuthorDropdown(true)}
              onBlur={() => setTimeout(() => setShowAuthorDropdown(false), 200)}
            />
            {showAuthorDropdown && filteredAuthors.length > 0 && (
              <div className="mt-1 rounded border bg-popover shadow">
                {filteredAuthors.map((author) => (
                  <div
                    key={author.author_id}
                    className="cursor-pointer px-4 py-2 hover:bg-muted"
                    onClick={() => addAuthor(author)}
                  >
                    {author.author_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Label>Nhà xuất bản</Label>
          <Select
            value={formValues.publisher_id}
            onValueChange={(value) => setFormValues({ ...formValues, publisher_id: value })}
          >
            <SelectTrigger><SelectValue placeholder="Chọn NXB" /></SelectTrigger>
            <SelectContent>
              {publishers.map((p) => (
                <SelectItem key={p.publisher_id} value={p.publisher_id}>
                  {p.publisher_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label>Năm xuất bản</Label>
          <Input
            type="number"
            value={formValues.publication_year}
            onChange={(e) => setFormValues({ ...formValues, publication_year: e.target.value })}
            placeholder="Năm xuất bản"
          />

          <Label>ISBN</Label>
          <Input
            value={formValues.isbn}
            onChange={(e) => setFormValues({ ...formValues, isbn: e.target.value })}
            placeholder="ISBN"
            disabled={isEdit}
          />

          <Label>Ngôn ngữ</Label>
          <Input
            value={formValues.language}
            onChange={(e) => setFormValues({ ...formValues, language: e.target.value })}
            placeholder="Ngôn ngữ"
          />

          <Label>Lần sửa đổi</Label>
          <Input
            value={formValues.edition}
            onChange={(e) => setFormValues({ ...formValues, edition: e.target.value })}
            placeholder="Lần sửa"
          />

          <Label>Kệ sách</Label>
          <Select
            value={formValues.shelf_id}
            onValueChange={(value) => setFormValues({ ...formValues, shelf_id: value })}
          >
            <SelectTrigger><SelectValue placeholder="Chọn kệ" /></SelectTrigger>
            <SelectContent>
              {shelves.map((s) => (
                <SelectItem key={s.shelf_id} value={s.shelf_id}>
                  {s.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label>Thể loại</Label>
          <Select
            value={formValues.category_id}
            onValueChange={(value) => setFormValues({ ...formValues, category_id: value })}
          >
            <SelectTrigger><SelectValue placeholder="Chọn thể loại" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label>Mô tả</Label>
          <Textarea
            rows={4}
            value={formValues.description}
            onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
            placeholder="Mô tả sách"
          />

          <Label>Ảnh bìa</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setSelectedImage(file);
            }}
          />
          {selectedImage && (
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Xem trước ảnh"
              className="mt-2 max-h-48 rounded border"
            />
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu sách"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookFormModal;
