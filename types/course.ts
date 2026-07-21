export interface Section {
  heading: string;
  body: string;
  image: string | false;  // URL string from docx, or false if no image
  layout: "text-left image-right" | "image-left text-right" | "text-accordion" | "text-tabs" | null;
  component: "Accordion" | "Tabs" | null;
  items: string[];
}

export interface Module {
  id: string;
  number: number;
  title: string;
  duration: string;
  sections: Section[];
}

export interface Course {
  title: string;
  code: string;
  duration: string;
  deliveryMode: string;
  owner: string;
  description: string;
  modules: Module[];
}
