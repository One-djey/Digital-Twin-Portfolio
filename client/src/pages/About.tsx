import { motion } from "framer-motion";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { FaGithub, FaTwitter, FaLinkedin, FaArrowDown } from "react-icons/fa";

export default function About() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-white p-8"
      >
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">
          Create your own AI clone!
        </h1>

        <Card className="mb-8 bg-gray-50 shadow-inner rounded-lg">
          <CardContent className="pt-6">
            <p className="text-gray-800 text-lg">
              Imagine having your own{" "}
              <a
                href="https://github.com/One-djey/Digital-Twin-Portfolio"
                className="text-blue-600 hover:underline font-semibold"
              >
                Digital Twin Portfolio
              </a>{" "}
              without any cost! Clone this project from GitHub and start building
              your dream portfolio today.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center space-x-6">
            <motion.a
              href="https://github.com/One-djey/Digital-Twin-Portfolio"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gray-800 text-white px-4 py-2 rounded-full flex items-center hover:bg-gray-900 transition-colors"
            >
              <FaGithub size={20} className="mr-2" />
              View on GitHub
            </motion.a>
          </CardFooter>
        </Card>

        <section className="mt-12">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            MIT License
          </h2>
          <p className="text-gray-600 text-lg">
            This open-source project is under the MIT license. This license
            permits <span className="font-bold">free use</span>, modification, 
            and distribution of software, with the sole requirement that the 
            original <span className="font-bold">copyright notice must be 
            included</span> in all copies. It disclaims liability for the authors.
          </p>
        </section>
      </motion.div>

      
      <div className="flex justify-center">
        <FaArrowDown className="text-gray-400" />
      </div>

      <footer className="text-center text-gray-500 p-4">
        <p>
          Initially created by{" "}
          <a
            href="https://jeremy-maisse.com"
            className="text-gray-700 hover:underline"
          >
            Jeremy Maisse
          </a>{" "}
          &copy; {currentYear}
        </p>
      </footer>
    </div>
  );
}
